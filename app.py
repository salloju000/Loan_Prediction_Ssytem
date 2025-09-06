import streamlit as st
import pandas as pd
import numpy as np
import plotly.graph_objects as go
import plotly.express as px
from model import LoanPredictionModel
import warnings
warnings.filterwarnings("ignore")

# Page configuration
st.set_page_config(
    page_title="Loan Prediction System",
    page_icon="🏦",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Initialize the model
@st.cache_resource
def load_model():
    model = LoanPredictionModel()
    if model.load_model():
        return model
    else:
        st.error("Model not found! Please train the model first.")
        return None

# Custom CSS for better styling
st.markdown("""
<style>
    .main-header {
        font-size: 3rem;
        color: #1e3d59;
        text-align: center;
        margin-bottom: 2rem;
        font-weight: bold;
    }
    .sub-header {
        font-size: 1.5rem;
        color: #2e5266;
        margin: 1rem 0;
    }
    .result-box {
        padding: 1rem;
        border-radius: 10px;
        margin: 1rem 0;
        text-align: center;
    }
    .approved {
        background-color: #d4edda;
        border: 2px solid #155724;
        color: #155724;
    }
    .rejected {
        background-color: #f8d7da;
        border: 2px solid #721c24;
        color: #721c24;
    }
    .info-card {
        background-color: #f8f9fa;
        padding: 1rem;
        border-radius: 8px;
        border-left: 4px solid #007bff;
        margin: 1rem 0;
    }
</style>
""", unsafe_allow_html=True)

def main():
    # Main header
    st.markdown('<h1 class="main-header">🏦 Loan Prediction System</h1>', unsafe_allow_html=True)
    st.markdown("---")
    
    # Load model
    model = load_model()
    
    if model is None:
        st.stop()
    
    # Sidebar for navigation
    st.sidebar.title("Navigation")
    page = st.sidebar.radio("Select Page", ["Loan Prediction", "About", "Model Info"])
    
    if page == "Loan Prediction":
        show_prediction_page(model)
    elif page == "About":
        show_about_page()
    else:
        show_model_info_page()

def show_prediction_page(model):
    st.markdown('<h2 class="sub-header">📝 Loan Application Form</h2>', unsafe_allow_html=True)
    
    # Create two columns for input form
    col1, col2 = st.columns(2)
    
    with col1:
        st.subheader("Personal Information")
        gender = st.selectbox("Gender", ["Male", "Female"])
        married = st.selectbox("Marital Status", ["Yes", "No"])
        dependents = st.selectbox("Number of Dependents", ["0", "1", "2"])
        education = st.selectbox("Education Level", ["Graduate", "Not Graduate"])
        self_employed = st.selectbox("Self Employed", ["Yes", "No"])
        credit_history = st.selectbox("Credit History", 
                                    [1.0, 0.0], 
                                    format_func=lambda x: "Good" if x == 1.0 else "Poor")
    
    with col2:
        st.subheader("Financial Information")
        applicant_income = st.number_input("Applicant Income (₹)", min_value=0, value=5000, step=500)
        coapplicant_income = st.number_input("Co-applicant Income (₹)", min_value=0, value=0, step=500)
        loan_amount = st.number_input("Loan Amount (₹ in thousands)", min_value=0, value=150, step=10)
        loan_term = st.selectbox("Loan Term (years)", [5, 10, 15, 20, 25, 30])
    
    # Create input dictionary
    applicant_data = {
        'Gender': gender,
        'Married': married,
        'Dependents': dependents,
        'Education': education,
        'Self_Employed': self_employed,
        'ApplicantIncome': applicant_income,
        'CoapplicantIncome': coapplicant_income,
        'LoanAmount': loan_amount,
        'Loan_Amount_Term': loan_term,
        'Credit_History': credit_history
    }
    
    st.markdown("---")
    
    # Prediction button
    if st.button("🔍 Predict Loan Approval", type="primary", use_container_width=True):
        with st.spinner("Analyzing your application..."):
            try:
                result = model.predict_loan_approval(applicant_data)
                show_prediction_result(result, applicant_data)
            except Exception as e:
                st.error(f"Error making prediction: {str(e)}")

def show_prediction_result(result, applicant_data):
    st.markdown('<h2 class="sub-header">📊 Prediction Results</h2>', unsafe_allow_html=True)
    
    # Main result
    decision = result['decision']
    if decision == 'APPROVED':
        st.markdown(f'''
        <div class="result-box approved">
            <h2>✅ LOAN APPROVED!</h2>
            <p>Congratulations! Your loan application has been approved.</p>
        </div>
        ''', unsafe_allow_html=True)
    else:
        st.markdown(f'''
        <div class="result-box rejected">
            <h2>❌ LOAN REJECTED</h2>
            <p>Unfortunately, your loan application has been rejected.</p>
        </div>
        ''', unsafe_allow_html=True)
    
    # Detailed metrics
    col1, col2, col3 = st.columns(3)
    
    with col1:
        st.metric(
            "Approval Probability",
            f"{result['approval_probability']:.2%}",
            delta=f"{result['approval_probability'] - 0.5:.2%}" if result['approval_probability'] > 0.5 else None
        )
    
    with col2:
        st.metric(
            "Risk Level",
            result['risk_level'],
            delta="Low Risk" if result['risk_level'] == 'Low Risk' else None
        )
    
    with col3:
        st.metric(
            "Confidence",
            f"{result['confidence']:.2%}",
            delta=f"{result['confidence'] - 0.6:.2%}" if result['confidence'] > 0.6 else None
        )
    
    # Probability visualization
    st.subheader("📈 Probability Distribution")
    
    # Create a gauge chart for approval probability
    fig = go.Figure(go.Indicator(
        mode = "gauge+number+delta",
        value = result['approval_probability'] * 100,
        domain = {'x': [0, 1], 'y': [0, 1]},
        title = {'text': "Approval Probability (%)"},
        delta = {'reference': 50},
        gauge = {
            'axis': {'range': [None, 100]},
            'bar': {'color': "darkblue"},
            'steps': [
                {'range': [0, 50], 'color': "lightgray"},
                {'range': [50, 80], 'color': "yellow"},
                {'range': [80, 100], 'color': "lightgreen"}
            ],
            'threshold': {
                'line': {'color': "red", 'width': 4},
                'thickness': 0.75,
                'value': 70
            }
        }
    ))
    fig.update_layout(height=300)
    st.plotly_chart(fig, use_container_width=True)
    
    # Application summary
    st.subheader("📋 Application Summary")
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.markdown(f'''
        <div class="info-card">
            <strong>Personal Details:</strong><br>
            Gender: {applicant_data['Gender']}<br>
            Married: {applicant_data['Married']}<br>
            Dependents: {applicant_data['Dependents']}<br>
            Education: {applicant_data['Education']}<br>
            Self Employed: {applicant_data['Self_Employed']}
        </div>
        ''', unsafe_allow_html=True)
    
    with col2:
        total_income = applicant_data['ApplicantIncome'] + applicant_data['CoapplicantIncome']
        st.markdown(f'''
        <div class="info-card">
            <strong>Financial Details:</strong><br>
            Applicant Income: ₹{applicant_data['ApplicantIncome']:,}<br>
            Co-applicant Income: ₹{applicant_data['CoapplicantIncome']:,}<br>
            Total Income: ₹{total_income:,}<br>
            Loan Amount: ₹{applicant_data['LoanAmount'] * 1000:,}<br>
            Loan Term: {applicant_data['Loan_Amount_Term']} months
        </div>
        ''', unsafe_allow_html=True)

def show_about_page():
    st.markdown('<h2 class="sub-header">ℹ️ About This Application</h2>', unsafe_allow_html=True)
    
    st.markdown("""
    This **Loan Prediction System** uses machine learning to predict whether a loan application 
    will be approved or rejected based on various applicant features.
    
    ### 🎯 Purpose
    - Help financial institutions make informed decisions
    - Provide quick preliminary assessment for loan applications
    - Reduce manual processing time and effort
    
    ### 📊 Features Used
    The model considers the following factors:
    - **Personal Information**: Gender, Marital Status, Dependents, Education, Employment
    - **Financial Information**: Applicant Income, Co-applicant Income, Loan Amount, Credit History
    - **Engineered Features**: Income ratios, EMI calculations, risk assessments
    
    ### 🔧 Technology Stack
    - **Backend**: Python, Scikit-learn, Pandas, NumPy
    - **Frontend**: Streamlit
    - **Visualization**: Plotly
    - **Models**: Random Forest, Logistic Regression, SVM
    
    ### ⚠️ Disclaimer
    This tool is for educational and demonstration purposes only. Real loan decisions should 
    involve comprehensive analysis by qualified financial professionals.
    """)

def show_model_info_page():
    st.markdown('<h2 class="sub-header">🤖 Model Information</h2>', unsafe_allow_html=True)
    
    st.markdown("""
    ### 📈 Model Performance
    The system uses an ensemble approach, training multiple models and selecting the best performer:
    
    - **Random Forest Classifier**: Ensemble of decision trees with balanced class weights
    - **Logistic Regression**: Linear model with class balancing
    - **Support Vector Machine**: RBF kernel with probability estimation
    
    ### 🔄 Feature Engineering
    The model creates several engineered features to improve prediction accuracy:
    - Total household income
    - Loan amount to income ratio
    - Estimated monthly EMI
    - Income diversity metrics
    - Logarithmic transformations
    - Categorical binning
    
    ### 📊 Model Validation
    - **Cross-validation**: 5-fold stratified cross-validation
    - **Metrics**: ROC-AUC, Accuracy, Precision, Recall
    - **Data Split**: 80% training, 20% testing
    
    ### 🎛️ Hyperparameters
    The models are optimized with the following parameters:
    - **Random Forest**: 200 estimators, max depth 8, balanced classes
    - **Logistic Regression**: Max iterations 1000, balanced classes
    - **SVM**: RBF kernel, C=1.0, balanced classes
    """)
    
    # Model architecture diagram
    st.subheader("🏗️ Model Pipeline")
    pipeline_code = """
    Data Input → Feature Engineering → Preprocessing → Model Training → Prediction
         ↓              ↓                   ↓              ↓            ↓
    Raw Features → Engineered Features → Scaled/Encoded → Best Model → Probability
    """
    st.code(pipeline_code, language="text")

if __name__ == "__main__":
    main()