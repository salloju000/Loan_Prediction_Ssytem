# Loan Eligibility Prediction System

An AI-powered web application that predicts loan eligibility using Machine Learning. Built with React, TypeScript, FastAPI, and Scikit-learn.

## 🚀 Key Features

- **AI-Powered Predictions**: Instant eligibility analysis based on financial profile.
- **Multi-Step Wizard**: Intuitive UI for picking loan types (Car, Home, Education, etc.) and entering details.
- **Smart Input Masking**: Real-time currency formatting (Indian locale) for better readability.
- **Offline Mode**: Graceful fallback to mock predictions if the backend server is unreachable.
- **Currency Support**: Toggle between INR, USD, EUR, and GBP.
- **Dark Mode**: Beautiful, monochromatic design with full dark/light theme support.
- **Dockerized**: Easy deployment with Docker and Docker Compose.

## 🛠️ Technology Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, Sonner (Toasts).
- **Backend**: Python 3.10, FastAPI, Pydantic, Uvicorn.
- **Machine Learning**: Scikit-Learn, Joblib (Model Serialization).
- **DevOps**: Docker, Docker Compose, Nginx.

## 📦 Getting Started

### Prerequisites

- Node.js 18+
- Python 3.10+
- Docker & Docker Compose (optional)

### Local Development

#### 1. Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: .\venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```
The backend will run on `http://localhost:8000`.

#### 2. Frontend Setup
```bash
# In the root directory
npm install
npm run dev
```
The frontend will run on `http://localhost:5173`.

### Running with Docker

```bash
docker-compose up --build
```
- Frontend: `http://localhost:8080`
- Backend: `http://localhost:8000`

## 📂 Project Structure

- `/src`: React frontend source code.
- `/backend`: FastAPI backend and ML model artifacts.
- `/public`: Static assets (icons, manifest).
- `docker-compose.yml`: Orchestrates frontend and backend services.

## ⚠️ Important Note on Large Files

The ML model artifact (`backend/loan_model_artifacts.pkl`) is approximately **165MB**. 

- **Git LFS**: If you plan to push this to GitHub, please ensure you have **Git LFS** (Large File Storage) installed and initialized:
  ```bash
  git lfs install
  git lfs track "backend/loan_model_artifacts.pkl"
  ```
- **Alternative**: You can add the file to `.gitignore` and host it externally (S3, Google Drive) and provide a download script.

## 📜 License

MIT License.
