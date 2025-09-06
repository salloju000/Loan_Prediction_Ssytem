import pandas as pd
import numpy as np
import pickle
import os
from sklearn.model_selection import train_test_split, cross_val_score, StratifiedKFold
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.svm import SVC
from sklearn.metrics import accuracy_score, roc_auc_score
import warnings
warnings.filterwarnings("ignore")

class LoanPredictionModel:
    def __init__(self):
        self.model_pipeline = None
        self.categorical_features = ['Gender', 'Married', 'Dependents', 'Education', 'Self_Employed']
        self.numerical_features = ['ApplicantIncome', 'CoapplicantIncome', 'LoanAmount', 'Loan_Amount_Term']
        self.model_path = 'trained_model.pkl'
        
    def _create_robust_features(self, df):
        """Create robust features for the loan prediction model"""
        # Map Credit_History to more descriptive labels
        df['Credit_History_Status'] = df['Credit_History'].map({
            1.0: 'good_credit', 
            0.0: 'bad_credit'
        }).fillna('no_credit_history')
        
        # Create new numerical features
        df['Total_Income'] = df['ApplicantIncome'] + df['CoapplicantIncome']
        
        df['LoanAmount_Income_Ratio'] = np.where(
            df['Total_Income'] > 0, 
            df['LoanAmount'] / df['Total_Income'], 
            df['LoanAmount'] / 1000
        )
        df['LoanAmount_Income_Ratio'] = np.clip(df['LoanAmount_Income_Ratio'], 0, 10)
        
        df['EMI'] = np.where(
            df['Loan_Amount_Term'] > 0, 
            df['LoanAmount'] / df['Loan_Amount_Term'], 
            df['LoanAmount'] * 10
        )
        
        df['Has_Coapplicant'] = (df['CoapplicantIncome'] > 0).astype(int)
        
        df['Income_Diversity'] = np.where(
            df['CoapplicantIncome'] > 0, 
            df['CoapplicantIncome'] / (df['Total_Income'] + 1), 
            0
        )
        
        df['Log_ApplicantIncome'] = np.log1p(df['ApplicantIncome'])
        df['Log_LoanAmount'] = np.log1p(df['LoanAmount'])
        
        df['Income_Category'] = pd.cut(
            df['ApplicantIncome'], 
            bins=[0, 3000, 6000, 12000, float('inf')], 
            labels=['Low', 'Medium', 'High', 'Very_High']
        ).astype(str)
        
        df['LoanAmount_Category'] = pd.cut(
            df['LoanAmount'], 
            bins=[0, 100, 200, 400, float('inf')], 
            labels=['Small', 'Medium', 'Large', 'Very_Large']
        ).astype(str)
        
        return df
    
    def _prepare_features(self):
        """Define the feature lists after engineering"""
        numerical_features = [
            'ApplicantIncome', 'CoapplicantIncome', 'LoanAmount', 'Loan_Amount_Term',
            'Total_Income', 'LoanAmount_Income_Ratio', 'EMI', 'Has_Coapplicant',
            'Income_Diversity', 'Log_ApplicantIncome', 'Log_LoanAmount'
        ]
        
        categorical_features = [
            'Gender', 'Married', 'Dependents', 'Education', 'Self_Employed',
            'Credit_History_Status', 'LoanAmount_Category', 'Income_Category'
        ]
        
        return numerical_features, categorical_features
    
    def train_model(self, data_path):
        """Train the loan prediction model"""
        # Load data
        df = pd.read_csv("Loan_Dataset.csv")
        
        # Apply feature engineering
        df = self._create_robust_features(df)
        
        # Get feature lists
        numerical_features, categorical_features = self._prepare_features()
        
        # Prepare features and target
        X = df[categorical_features + numerical_features]
        y = df['Loan_Status'].map({'Y': 1, 'N': 0})
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=69, stratify=y
        )
        
        # Create preprocessor
        preprocessor = ColumnTransformer([
            ('num', StandardScaler(), numerical_features),
            ('cat', OneHotEncoder(drop='first', sparse_output=False, handle_unknown='ignore'), categorical_features)
        ])
        
        # Define models
        models = {
            'Logistic Regression': LogisticRegression(
                max_iter=1000, random_state=69, class_weight='balanced'
            ),
            'Random Forest': RandomForestClassifier(
                n_estimators=200, max_depth=8, min_samples_split=20,
                min_samples_leaf=10, random_state=69, class_weight='balanced'
            ),
            'SVM': SVC(
                probability=True, random_state=69, class_weight='balanced',
                kernel='rbf', C=1.0
            )
        }
        
        model_results = []
        
        for name, model in models.items():
            # Create pipeline
            pipeline = Pipeline([
                ('preprocessor', preprocessor),
                ('classifier', model)
            ])
            
            # Cross-validation
            cv_scores = cross_val_score(
                pipeline, X_train, y_train,
                cv=StratifiedKFold(n_splits=5, shuffle=True, random_state=69),
                scoring='roc_auc'
            )
            
            # Fit and evaluate
            pipeline.fit(X_train, y_train)
            y_pred = pipeline.predict(X_test)
            y_proba = pipeline.predict_proba(X_test)[:, 1]
            
            model_results.append({
                'Model': name,
                'CV AUC Mean': cv_scores.mean(),
                'CV AUC Std': cv_scores.std(),
                'Test Accuracy': accuracy_score(y_test, y_pred),
                'Test AUC': roc_auc_score(y_test, y_proba),
                'Pipeline': pipeline
            })
            
            print(f"{name} - CV AUC: {cv_scores.mean():.4f} (+/- {cv_scores.std()*2:.4f})")
        
        # Select best model
        best_result = max(model_results, key=lambda x: x['CV AUC Mean'])
        self.model_pipeline = best_result['Pipeline']
        
        print(f"\nBest Model: {best_result['Model']}")
        print(f"CV AUC: {best_result['CV AUC Mean']:.4f}")
        print(f"Test AUC: {best_result['Test AUC']:.4f}")
        
        # Save the model
        self.save_model()
        
        return best_result
    
    def save_model(self):
        """Save the trained model to disk"""
        if self.model_pipeline is not None:
            with open(self.model_path, 'wb') as f:
                pickle.dump(self.model_pipeline, f)
            print(f"Model saved to {self.model_path}")
    
    def load_model(self):
        """Load the trained model from disk"""
        if os.path.exists(self.model_path):
            with open(self.model_path, 'rb') as f:
                self.model_pipeline = pickle.load(f)
            print("Model loaded successfully")
            return True
        else:
            print("No saved model found. Please train the model first.")
            return False
    
    def predict_loan_approval(self, applicant_data):
        """Predict loan approval for a single applicant"""
        if self.model_pipeline is None:
            if not self.load_model():
                raise ValueError("No trained model available. Please train the model first.")
        
        # Convert input to DataFrame
        df_input = pd.DataFrame([applicant_data])
        
        # Apply feature engineering
        df_input = self._create_robust_features(df_input)
        
        # Make prediction
        prediction = self.model_pipeline.predict(df_input)[0]
        probabilities = self.model_pipeline.predict_proba(df_input)[0]
        
        # Determine risk level
        approval_prob = probabilities[1]
        if approval_prob >= 0.7:
            risk_level = 'Low Risk'
        elif approval_prob >= 0.5:
            risk_level = 'Medium Risk'
        else:
            risk_level = 'High Risk'
        
        return {
            'decision': 'APPROVED' if prediction == 1 else 'REJECTED',
            'approval_probability': round(approval_prob, 4),
            'rejection_probability': round(probabilities[0], 4),
            'risk_level': risk_level,
            'confidence': round(max(probabilities), 4)
        }

# Example usage
if __name__ == "__main__":
    # Initialize model
    model = LoanPredictionModel()
    
    # Train model (uncomment and provide your data path)
    # model.train_model('your_dataset.csv')
    
    # Example prediction
    sample_data = {
        'Gender': 'Male',
        'Married': 'Yes',
        'Dependents': '0',
        'Education': 'Graduate',
        'Self_Employed': 'No',
        'ApplicantIncome': 5000,
        'CoapplicantIncome': 2000,
        'LoanAmount': 150,
        'Loan_Amount_Term': 360,
        'Credit_History': 1.0
    }
    
    # Load model and make prediction
    if model.load_model():
        result = model.predict_loan_approval(sample_data)
        print("Prediction Result:", result)