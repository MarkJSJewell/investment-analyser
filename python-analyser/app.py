import streamlit as st
import pdfplumber
import json
import matplotlib.pyplot as plt
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage

# --- 1. CONFIGURATION ---
st.set_page_config(page_title="Financial Analyzer (Gemini)", layout="wide")

# --- Initialize Session State (Crucial for Tabs) ---
if "results" not in st.session_state:
    st.session_state.results = None
if "summary" not in st.session_state:
    st.session_state.summary = None

class EarningsAnalyzer:
    def __init__(self, api_key):
        self.llm = ChatGoogleGenerativeAI(
            model="gemini-1.5-flash", 
            google_api_key=api_key,
            temperature=0
        )

    def extract_text(self, uploaded_file):
        """Reads the ENTIRE PDF."""
        text = ""
        try:
            with pdfplumber.open(uploaded_file) as pdf:
                for page in pdf.pages:
                    extract = page.extract_text()
                    if extract: text += extract
            return text
        except Exception as e:
            st.error(f"❌ Error reading PDF: {e}")
            return None

    def clean_json(self, raw_output):
        text = raw_output.replace("```json", "").replace("```", "").strip()
        try:
            return json.loads(text)
        except:
            return None

    def analyze_full_report(self, text, q_name):
        prompt = f"""
        You are a financial analyst. Extract data from this {q_name} report.
        
        CRITICAL RULES:
        1. Ignore "Year Ended" columns. ONLY use "Three Months Ended" (Quarterly).
        2. Return ONLY a valid JSON object. No intro text.
        
        REQUIRED JSON STRUCTURE:
        {{
            "quarterly_revenue_bn": 0.0,
            "eps": 0.0,
            "net_interest_income_millions": 0,
            "dividend_per_share": 0.0,
            "assets_under_supervision_bn": 0.0
        }}
        
        REPORT TEXT:
        {text}
        """
        return self.llm.invoke([HumanMessage(content=prompt)]).content

    def generate_summary(self, data):
        context = json.dumps(data, indent=2)
        prompt = f"""
        Write a professional executive summary for these quarterly results.
        Focus on the Revenue Trend and Asset Growth.
        
        Data: {context}
        """
        return self.llm.invoke([HumanMessage(content=prompt)]).content

# --- 2. SIDEBAR ---
with st.sidebar:
    st.header("⚙️ Settings")
    google_api_key = st.text_input("Google API Key", type="password")
    st.caption("Get a free key at aistudio.google.com")
    uploaded_files = st.file_uploader("Upload Reports (Q1-Q4)", type="pdf", accept_multiple_files=True)
    
    # Run button is now in sidebar to keep main area clean for tabs
    run_btn = st.button("Run Analysis", type="primary")

# --- 3. MAIN LOGIC ---
st.title("🚀 Financial Analyzer (Gemini Edition)")

if run_btn:
    if not google_api_key or not uploaded_files:
        st.error("Please provide a Google API Key and Upload Files.")
    else:
        analyzer = EarningsAnalyzer(google_api_key)
        temp_results = {}
        
        progress_bar = st.progress(0, text="Starting analysis...")
        
        for i, file in enumerate(uploaded_files):
            q_name = file.name.replace(".pdf", "")
            progress_bar.progress((i / len(uploaded_files)), text=f"Analyzing {q_name}...")
            
            text = analyzer.extract_text(file)
            
            if text:
                try:
                    raw_json = analyzer.analyze_full_report(text, q_name)
                    data = analyzer.clean_json(raw_json)
                    
                    if data:
                        temp_results[q_name] = data
                    else:
                        st.error(f"Failed to parse data for {q_name}")
                except Exception as e:
                    st.error(f"API Error: {e}")
        
        # --- Generate Summary ---
        if temp_results:
            progress_bar.progress(0.9, text="Generating Executive Summary...")
            summary_text = analyzer.generate_summary(temp_results)
            
            # Save to Session State (So data persists when switching tabs)
            st.session_state.results = temp_results
            st.session_state.summary = summary_text
            
        progress_bar.progress(1.0, text="Done!")

# --- 4. TABS DISPLAY ---
# We only show tabs if results exist in session state
if st.session_state.results:
    # Create the Tabs
    tab1, tab2, tab3 = st.tabs(["📈 Dashboard", "📝 Executive Summary", "🔍 Raw Data"])

    # --- TAB 1: DASHBOARD ---
    with tab1:
        results = st.session_state.results
        quarters = sorted(results.keys())
        
        st.subheader("Key Metrics")
        cols = st.columns(len(quarters))
        for idx, q in enumerate(quarters):
            data = results[q]
            cols[idx].metric(
                label=q, 
                value=f"${data.get('quarterly_revenue_bn', 0)}B", 
                delta=f"EPS: ${data.get('eps', 0)}"
            )
        
        st.divider()
        
        # Charts
        c1, c2 = st.columns(2)
        
        # Revenue Chart
        revs = [results[q].get('quarterly_revenue_bn', 0) for q in quarters]
        fig, ax = plt.subplots()
        ax.bar(quarters, revs, color='#4285F4')
        ax.set_title("Quarterly Revenue ($bn)")
        c1.pyplot(fig)
        
        # AUS Chart
        aus = [results[q].get('assets_under_supervision_bn', 0) for q in quarters]
        fig2, ax2 = plt.subplots()
        ax2.bar(quarters, aus, color='#34A853')
        ax2.set_title("Assets Under Supervision ($bn)")
        c2.pyplot(fig2)

    # --- TAB 2: EXECUTIVE SUMMARY ---
    with tab2:
        st.subheader("AI Generated Report")
        st.markdown(st.session_state.summary)

    # --- TAB 3: RAW DATA ---
    with tab3:
        st.subheader("Extracted JSON Data")
        st.json(st.session_state.results)
