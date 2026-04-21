# 🔥 FireReach – AI-Based Outreach Automation System

FireReach is a full-stack application that automates outreach workflows by generating and sending emails using AI and external APIs.

It integrates **LLM-based message generation, real-time data retrieval, and email automation** into a single system.

---

## 🚀 What It Does

* Takes user input from frontend
* Uses AI (Groq API) to generate outreach content
* Optionally enhances content using web data (Tavily API)
* Sends emails via Gmail SMTP

---

## 🧠 Key Highlights

* Built a **modular backend system** with separate tools for:

  * Message generation
  * Data analysis
  * Email sending

* Implemented **API-based architecture** using FastAPI

* Integrated **multiple external services**:

  * Groq (LLM inference)
  * Tavily (web data)
  * Gmail SMTP (email delivery)

* Designed a **React-based frontend** for user interaction

---

## 🏗️ Project Structure

```id="nyl7c0"
FireReach/
├── backend/
│   ├── main.py
│   ├── agent.py
│   ├── tools/
│   │   ├── analyst.py
│   │   ├── sender.py
│   │   └── harvester.py
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   └── index.css
│   └── index.html
│
└── .gitignore
```

---

## ⚙️ Tech Stack

* **Backend:** FastAPI (Python)
* **Frontend:** React (Vite)
* **AI Integration:** Groq API
* **Search API:** Tavily
* **Email Service:** Gmail SMTP

---

## 🛠️ Setup Instructions

### Backend

```bash id="0t3xq6"
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

Create `.env`:

```env id="l18v5r"
GROQ_API_KEY=your_key
TAVILY_API_KEY=your_key
EMAIL_USER=your_email
EMAIL_PASS=your_app_password
```

Run server:

```bash id="k0u7xm"
uvicorn main:app --reload
```

---

### Frontend

```bash id="wr5o1d"
cd frontend
npm install
npm run dev
```

---

## 🧪 Functionality Overview

1. User enters input on frontend
2. Request is sent to FastAPI backend
3. Backend agent:

   * Generates content using Groq
   *  fetches supporting data via Tavily
   *  Accordingly draft email 
4. Email tool sends message using Gmail via smtp

---

## 🔐 Security Considerations

* Sensitive credentials stored in `.env`
* `.env` excluded via `.gitignore`
* Gmail App Password used instead of main password

---

## 📌 Use Cases

* Automated outreach emails
* AI-assisted communication
* Basic campaign automation workflows

---

## 👩‍💻 Author

Esha Goyal

---

## ⭐ Why This Project Stands Out

* Demonstrates **real-world API integration**
* Combines **AI + automation + full-stack development**
* Shows ability to build **modular backend systems**
