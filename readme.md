<h1 align="center">🏨 Loan Prediction </h1>
<p align="center">
  A machine learning-based project that predicts loan eligibility for applicants based on various financial and personal factors. Designed to assist financial institutions in making faster and more reliable loan approval decisions.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.8+-blue.svg" />
  <img src="https://img.shields.io/badge/Status-Complete-success.svg" />
  <img src="https://img.shields.io/badge/License-MIT-green.svg" />
  <img src="https://img.shields.io/badge/Model-LogisticRegression-purple.svg" />
</p>

---

## 🧠 Project Description

This Loan Prediction System uses historical loan application data to predict whether a loan should be approved or not. It simplifies the loan approval process by automatically evaluating eligibility based on factors like income, credit history, dependents, and more.

The model is trained using supervised machine learning techniques, and the application provides a user-friendly interface for real-time predictions.

---

## 📌 Features

- 📊 Data cleaning and preprocessing
- 📈 Exploratory Data Analysis (EDA)
- 🔍 Feature engineering
- 🤖 Logistic Regression Model
- 🧪 Model evaluation using accuracy and classification metrics
- 🖥️ Web interface using Streamlit
- 💾 Trained model saved as `.pkl` for reuse

---
---

## 🖼️ Dashboard Preview

Below is a snapshot of the interactive dashboard generated during the analysis:

<p align="center">
  <img src="Screenshort.png" alt="Loan Prediction Dashboard" width="700"/>
</p>

## 📁 Dataset

- **Source**: [Kaggle - Loan Prediction Dataset](https://www.kaggle.com/datasets)
- - **Features**:
  - `Gender`, `Married`, `Dependents`, `Education`, `Self_Employed`
  - `ApplicantIncome`, `CoapplicantIncome`, `LoanAmount`, `Loan_Amount_Term`, `Credit_History`
  - `Property_Area`, `Loan_Status`

> ⚠️ The dataset is included in this repository as `Loan_Dataset.csv`.
---

## 🛠️ Technologies Used

- **Python 3.8+**
- **Pandas** – Data manipulation
- **NumPy** – Numerical computations
- **Scikit-learn** – Machine Learning model
- **Matplotlib & Seaborn** – Data visualization
- **Flask** – Web framework

---

## 🚀 Getting Started

### ✅ Prerequisites

Make sure you have:
- Python 3.8+ installed
- pip (Python package installer)
- Jupyter Notebook (recommended)

### 📦 Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/hotel-cancellation-analysis.git

# Navigate into the project folder
cd Loan_Prediction_System

# (Optional) Create and activate a virtual environment
python -m venv hotel_analysis_env
venv\Scripts\activate     # On Windows

# Install dependencies
pip install -r requirements.txt

# Run the analysis
jupyter notebook
# or
streamlit run app.py
