"""
Loan Prediction API
====================
Single entry point for all loan types.
  - Model 1: Classifies approval (Yes / No)
  - Model 2: Predicts sanctioned amount (only if approved)

Usage:
    from loan_predictor import LoanPredictor
    predictor = LoanPredictor("loan_model_artifacts.pkl")
    result = predictor.predict({...})
"""

from __future__ import annotations

import logging
import os
import pickle
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

# ── Logging ───────────────────────────────────────────────────────────────────
logger = logging.getLogger(__name__)

# ── Constants ─────────────────────────────────────────────────────────────────
VALID: dict[str, list[str]] = {
    "loan_type": ["homeLoan", "carLoan", "educationLoan", "personalLoan", "bikeLoan"],
    "gender": ["Male", "Female"],
    "marital_status": ["Single", "Married", "Divorced"],
    "education": ["Graduate", "Post-Graduate", "Undergraduate", "Diploma"],
    "employment_type": [
        "Salaried",
        "Self-Employed",
        "Business",
        "Government",
        "Freelancer",
    ],
    "property_area": ["Urban", "Semi-Urban", "Rural"],
    "course_type": ["Engineering", "Medical", "MBA", "Law", "Arts", "Science"],
    "institution_tier": ["Tier-1", "Tier-2", "Tier-3"],
}

LOAN_TYPE_REQUIRED: dict[str, list[str]] = {
    "homeLoan": ["property_value"],
    "carLoan": ["vehicle_price", "vehicle_age_years"],
    "bikeLoan": ["vehicle_price", "vehicle_age_years"],
    "educationLoan": ["course_type", "institution_tier"],
    "personalLoan": [],
}

NUMERIC_RANGES: dict[str, tuple[float, float]] = {
    "age": (18, 70),
    "credit_score": (300, 900),
    "monthly_income": (1_000, 10_000_000),
    "coapplicant_income": (0, 10_000_000),
    "loan_amount_requested": (1_000, 100_000_000),
    "loan_tenure_months": (1, 480),
    "dependents": (0, 10),
    "existing_loans_count": (0, 20),
    "existing_emis": (0, 10_000_000),
    "years_of_experience": (0, 50),
}

TIER_MAP: dict[str, int] = {"Tier-1": 3, "Tier-2": 2, "Tier-3": 1, "Unknown": 0}

CREDIT_BINS = [0, 550, 600, 650, 700, 750, 800, 901]
CREDIT_LABELS = [1, 2, 3, 4, 5, 6, 7]

# ── Custom exceptions ─────────────────────────────────────────────────────────


class LoanPredictorError(Exception):
    """Base exception for LoanPredictor errors."""


class ArtifactLoadError(LoanPredictorError):
    """Raised when model artifacts cannot be loaded."""


class ValidationError(LoanPredictorError):
    """Raised when input validation fails."""

    def __init__(self, errors: list[str]) -> None:
        self.errors = errors
        super().__init__(f"Validation failed with {len(errors)} error(s): {errors}")


class PredictionError(LoanPredictorError):
    """Raised when model inference fails."""


# ── Artifact container ────────────────────────────────────────────────────────


@dataclass(frozen=True)
class ModelArtifacts:
    classifier: Any
    regressor: Any
    scaler: Any
    label_encoders: dict[str, Any]
    feature_columns: list[str]

    @classmethod
    def from_pickle(cls, path: str | Path) -> "ModelArtifacts":
        path = Path(path)
        if not path.exists():
            raise ArtifactLoadError(f"Artifact file not found: {path}")
        if not path.is_file():
            raise ArtifactLoadError(f"Artifact path is not a file: {path}")

        try:
            with path.open("rb") as f:
                arts = pickle.load(f)  # noqa: S301 – trusted internal artifacts
        except (pickle.UnpicklingError, EOFError, ValueError) as exc:
            raise ArtifactLoadError(f"Failed to unpickle artifacts: {exc}") from exc

        required_keys = {
            "classifier",
            "regressor",
            "scaler",
            "label_encoders",
            "feature_columns",
        }
        missing = required_keys - arts.keys()
        if missing:
            raise ArtifactLoadError(f"Artifact file is missing keys: {missing}")

        return cls(
            classifier=arts["classifier"],
            regressor=arts["regressor"],
            scaler=arts["scaler"],
            label_encoders=arts["label_encoders"],
            feature_columns=arts["feature_columns"],
        )


# ── Main predictor ────────────────────────────────────────────────────────────


class LoanPredictor:
    """
    Predicts loan approval and sanctioned amount for multiple loan types.

    Args:
        artifacts_path: Path to the pickled model artifacts file.

    Raises:
        ArtifactLoadError: If the artifact file is missing, corrupt, or incomplete.
    """

    def __init__(self, artifacts_path: str | Path) -> None:
        self._artifacts = ModelArtifacts.from_pickle(artifacts_path)
        logger.info("LoanPredictor loaded artifacts from '%s'", artifacts_path)

    # ── Public API ────────────────────────────────────────────────────────────

    def predict(self, applicant: dict[str, Any]) -> dict[str, Any]:
        """
        Run the full prediction pipeline for a loan application.

        Required fields (all loan types):
            loan_type, age, gender, marital_status, dependents, education,
            employment_type, years_of_experience, monthly_income,
            coapplicant_income, credit_score, existing_emis,
            existing_loans_count, property_area,
            loan_amount_requested, loan_tenure_months

        Conditional fields:
            homeLoan      → property_value
            carLoan/bike  → vehicle_price, vehicle_age_years
            educationLoan → course_type, institution_tier

        Returns:
            dict with: status, approved, probability, sanctioned_amount,
                       rejection_reasons, loan_grade, breakdown
        """
        start = time.perf_counter()

        errors = self._validate(applicant)
        if errors:
            return {"status": "error", "errors": errors}

        try:
            result = self._run_prediction(applicant)
        except Exception as exc:
            logger.exception("Prediction failed for applicant: %s", exc)
            raise PredictionError(f"Prediction pipeline failed: {exc}") from exc

        elapsed_ms = round((time.perf_counter() - start) * 1000, 2)
        result["processing_time_ms"] = elapsed_ms
        logger.info(
            "Prediction complete | loan_type=%s approved=%s prob=%.2f elapsed_ms=%s",
            applicant.get("loan_type"),
            result.get("approved"),
            result.get("approval_probability", 0),
            elapsed_ms,
        )
        return result

    # ── Core prediction pipeline ──────────────────────────────────────────────

    def _run_prediction(self, applicant: dict[str, Any]) -> dict[str, Any]:
        row = self._build_features(applicant)
        df_row = pd.DataFrame([row])[self._artifacts.feature_columns]

        prob = float(self._artifacts.classifier.predict_proba(df_row)[0][1])
        approved = int(self._artifacts.classifier.predict(df_row)[0])
        grade = self._loan_grade(prob)

        sanctioned = 0
        if approved:
            raw = float(self._artifacts.regressor.predict(df_row)[0])
            sanctioned = int(np.clip(raw, 0, applicant["loan_amount_requested"]))

        rejection_reasons = [] if approved else self._rejection_reasons(row, applicant)
        breakdown = self._breakdown(row, applicant, prob, sanctioned)
        tenure = applicant["loan_tenure_months"]
        requested = applicant["loan_amount_requested"]

        return {
            "status": "success",
            "loan_type": applicant["loan_type"],
            "applicant_name": applicant.get("name", "Applicant"),
            "approved": bool(approved),
            "approval_probability": round(prob * 100, 2),
            "loan_grade": grade,
            "loan_amount_requested": requested,
            "sanctioned_amount": sanctioned,
            "sanction_ratio": round(sanctioned / requested * 100, 1)
            if sanctioned > 0
            else 0,
            "monthly_emi": round(sanctioned / tenure, 0) if sanctioned > 0 else 0,
            "rejection_reasons": rejection_reasons,
            "breakdown": breakdown,
        }

    # ── Input validation ──────────────────────────────────────────────────────

    def _validate(self, a: dict[str, Any]) -> list[str]:
        errors: list[str] = []

        # 1. Required base fields
        required_base = [
            "loan_type",
            "age",
            "gender",
            "marital_status",
            "dependents",
            "education",
            "employment_type",
            "years_of_experience",
            "monthly_income",
            "coapplicant_income",
            "credit_score",
            "existing_emis",
            "existing_loans_count",
            "property_area",
            "loan_amount_requested",
            "loan_tenure_months",
        ]
        missing = [f for f in required_base if f not in a]
        if missing:
            errors.extend(f"Missing required field: '{f}'" for f in missing)
            return errors  # cannot validate further without base fields

        # 2. Type checks for numeric fields
        numeric_fields = [
            "age",
            "monthly_income",
            "coapplicant_income",
            "credit_score",
            "existing_emis",
            "existing_loans_count",
            "loan_amount_requested",
            "loan_tenure_months",
            "dependents",
            "years_of_experience",
        ]
        for f in numeric_fields:
            if f in a and not isinstance(a[f], (int, float)):
                errors.append(f"'{f}' must be a number, got {type(a[f]).__name__!r}")

        if errors:
            return errors  # skip range checks if types are wrong

        # 3. Categorical validation
        for field, options in VALID.items():
            if field in a and a[field] not in options:
                errors.append(f"'{field}' must be one of {options}, got {a[field]!r}")

        # 4. Loan-type-specific required fields
        loan_type = a.get("loan_type")
        if loan_type in LOAN_TYPE_REQUIRED:
            for f in LOAN_TYPE_REQUIRED[loan_type]:
                if f not in a:
                    errors.append(f"'{f}' is required for {loan_type}")

        # 5. Numeric range validation
        for f, (lo, hi) in NUMERIC_RANGES.items():
            if f in a and isinstance(a[f], (int, float)) and not (lo <= a[f] <= hi):
                errors.append(f"'{f}' must be between {lo} and {hi}, got {a[f]}")

        # 6. Business logic cross-field checks
        if "monthly_income" in a and "coapplicant_income" in a:
            if a["monthly_income"] + a["coapplicant_income"] <= 0:
                errors.append(
                    "Total income (monthly_income + coapplicant_income) must be positive"
                )

        return errors

    # ── Feature construction ──────────────────────────────────────────────────

    def _build_features(self, a: dict[str, Any]) -> dict[str, Any]:
        loan_type = a["loan_type"]
        total_income = a["monthly_income"] + a["coapplicant_income"]
        safe_income = max(total_income, 1)
        tenure = max(a["loan_tenure_months"], 1)
        amt = a["loan_amount_requested"]

        monthly_emi_proj = amt / tenure
        dti = (a["existing_emis"] + monthly_emi_proj) / safe_income

        property_value = a.get("property_value") or 0
        ltv_ratio = round(amt / property_value, 4) if property_value > 0 else 0.0

        vehicle_age_years = a.get("vehicle_age_years") or 0
        course_type = a.get("course_type") or "Unknown"
        institution_tier = a.get("institution_tier") or "Unknown"

        credit_band = int(
            pd.cut(
                [a["credit_score"]],
                bins=CREDIT_BINS,
                labels=CREDIT_LABELS,
            )[0]
        )

        age_experience_denominator = max(a["age"] - 20, 1)

        return {
            # Raw applicant features
            "age": a["age"],
            "dependents": a["dependents"],
            "years_of_experience": a["years_of_experience"],
            "monthly_income": a["monthly_income"],
            "coapplicant_income": a["coapplicant_income"],
            "credit_score": a["credit_score"],
            "existing_emis": a["existing_emis"],
            "existing_loans_count": a["existing_loans_count"],
            "loan_amount_requested": amt,
            "loan_tenure_months": tenure,
            # Derived features
            "debt_to_income_ratio": round(dti, 4),
            "ltv_ratio": ltv_ratio,
            "vehicle_age_years": vehicle_age_years,
            "total_income": total_income,
            "emi_to_income_ratio": round(monthly_emi_proj / safe_income, 4),
            "loan_to_income_ratio": round(amt / safe_income, 4),
            "income_stability_score": round(
                a["years_of_experience"] * a["monthly_income"] / 1e6, 4
            ),
            "credit_score_band": float(credit_band),
            "has_coapplicant": int(a["coapplicant_income"] > 0),
            "income_per_dependent": round(total_income / (a["dependents"] + 1), 2),
            "monthly_emi_projected": round(monthly_emi_proj, 2),
            "free_monthly_income": round(
                total_income - a["existing_emis"] - monthly_emi_proj, 2
            ),
            "is_high_risk": int(
                dti > 0.6 and a["credit_score"] < 650 and a["existing_loans_count"] >= 2
            ),
            "age_experience_ratio": round(
                a["years_of_experience"] / age_experience_denominator, 4
            ),
            "institution_tier_num": TIER_MAP.get(institution_tier, 0),
            # Encoded categoricals
            "loan_type_enc": self._encode("loan_type", loan_type),
            "gender_enc": self._encode("gender", a["gender"]),
            "marital_status_enc": self._encode("marital_status", a["marital_status"]),
            "education_enc": self._encode("education", a["education"]),
            "employment_type_enc": self._encode(
                "employment_type", a["employment_type"]
            ),
            "property_area_enc": self._encode("property_area", a["property_area"]),
            "course_type_enc": self._encode("course_type", course_type),
            "institution_tier_enc": self._encode("institution_tier", institution_tier),
        }

    def _encode(self, col: str, val: str) -> int:
        le = self._artifacts.label_encoders.get(col)
        if le is None:
            logger.warning(
                "No label encoder found for column '%s'; defaulting to 0", col
            )
            return 0
        safe_val = val if val in le.classes_ else "Unknown"
        return int(le.transform([safe_val])[0])

    # ── Loan grade ────────────────────────────────────────────────────────────

    @staticmethod
    def _loan_grade(prob: float) -> str:
        thresholds = [
            (0.90, "A+ (Excellent)"),
            (0.80, "A  (Very Good)"),
            (0.70, "B  (Good)"),
            (0.60, "C  (Average)"),
            (0.50, "D  (Below Average)"),
        ]
        for threshold, grade in thresholds:
            if prob >= threshold:
                return grade
        return "E  (High Risk)"

    # ── Rejection reasons ─────────────────────────────────────────────────────

    @staticmethod
    def _rejection_reasons(row: dict[str, Any], a: dict[str, Any]) -> list[str]:
        reasons: list[str] = []
        cs = a["credit_score"]
        dti = row["debt_to_income_ratio"]
        fmi = row["free_monthly_income"]
        elc = a["existing_loans_count"]
        lir = row["loan_to_income_ratio"]

        if cs < 600:
            reasons.append(f"Credit score too low ({cs} < 600 minimum required)")
        elif cs < 650:
            reasons.append(
                f"Credit score below preferred threshold ({cs}; prefer 650+)"
            )

        if dti > 0.65:
            reasons.append(f"Debt-to-income ratio too high ({dti:.2f} > 0.65 maximum)")
        elif dti > 0.50:
            reasons.append(f"Debt-to-income ratio elevated ({dti:.2f}; prefer ≤ 0.50)")

        if fmi <= 0:
            reasons.append(f"Insufficient free monthly income after EMIs (₹{fmi:,.0f})")
        elif fmi < 5_000:
            reasons.append(f"Very low free monthly income remaining (₹{fmi:,.0f})")

        if elc >= 4:
            reasons.append(f"Too many existing loans ({elc} active loans)")
        elif elc >= 3:
            reasons.append(f"High existing loan burden ({elc} active loans)")

        if lir > 40:
            reasons.append(
                f"Loan amount too high relative to income (ratio: {lir:.1f}x)"
            )

        if not reasons:
            reasons.append("Multiple borderline risk factors combined led to rejection")

        return reasons

    # ── Human-readable breakdown ──────────────────────────────────────────────

    @staticmethod
    def _breakdown(
        row: dict[str, Any],
        a: dict[str, Any],
        prob: float,
        sanctioned: int,
    ) -> dict[str, Any]:
        total_income = row["total_income"]
        tenure = a["loan_tenure_months"]

        return {
            "financial_health": {
                "total_monthly_income": f"₹{total_income:,.0f}",
                "existing_monthly_emis": f"₹{a['existing_emis']:,.0f}",
                "projected_new_emi": f"₹{row['monthly_emi_projected']:,.0f}",
                "free_monthly_income": f"₹{row['free_monthly_income']:,.0f}",
                "debt_to_income_ratio": f"{row['debt_to_income_ratio']:.2%}",
                "emi_to_income_ratio": f"{row['emi_to_income_ratio']:.2%}",
            },
            "credit_profile": {
                "credit_score": a["credit_score"],
                "credit_score_band": LoanPredictor._cs_label(a["credit_score"]),
                "existing_loans": a["existing_loans_count"],
                "is_high_risk_flag": bool(row["is_high_risk"]),
            },
            "loan_metrics": {
                "amount_requested": f"₹{a['loan_amount_requested']:,.0f}",
                "tenure": (f"{tenure} months ({tenure // 12} yrs {tenure % 12} mo)"),
                "loan_to_income_ratio": f"{row['loan_to_income_ratio']:.1f}x",
                "sanctioned_amount": f"₹{sanctioned:,.0f}" if sanctioned > 0 else "N/A",
                "monthly_emi_if_approved": (
                    f"₹{sanctioned / tenure:,.0f}" if sanctioned > 0 else "N/A"
                ),
            },
            "approval_confidence": f"{prob * 100:.1f}%",
        }

    @staticmethod
    def _cs_label(cs: int) -> str:
        thresholds = [
            (800, "Exceptional"),
            (750, "Very Good"),
            (700, "Good"),
            (650, "Fair"),
            (600, "Poor"),
        ]
        for threshold, label in thresholds:
            if cs >= threshold:
                return label
        return "Very Poor"
