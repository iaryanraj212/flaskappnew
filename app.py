# app.py
import os
import google.generativeai as genai
from flask import Flask, render_template, request, jsonify
from datetime import datetime
import re

YOUR_ACTUAL_API_KEY = "AIzaSyBsj-13E1i755eJB90rqCh5SgKU3Xm2zaI" 

app = Flask(__name__)
app.secret_key = os.urandom(24) 

genai_model = None
chat_session = None
api_configured = False

def initialize_api():
    global genai_model, chat_session, api_configured
    try:
        if not YOUR_ACTUAL_API_KEY:
            print("API Key is missing.")
            api_configured = False
            return False
        genai.configure(api_key=YOUR_ACTUAL_API_KEY)
        genai_model = genai.GenerativeModel("gemini-1.5-flash") # Updated model
        chat_session = genai_model.start_chat(history=[])
        api_configured = True
        print("Gemini API initialized successfully.")
        return True
    except Exception as e:
        print(f"Error initializing Gemini API: {e}")
        api_configured = False
        return False

# Initialize API on startup
initialize_api()

# --- Helper Functions (adapted from your Tkinter app) ---
def format_message_for_html(message_text):
    """
    Basic markdown to HTML conversion for bold and italic.
    Converts ```code``` blocks to <pre><code>.
    """
    # Code blocks
    def replace_code_block(match):
        code_content = match.group(1).strip()
        escaped_code = code_content.replace('<', '&lt;').replace('>', '&gt;')
        return f'<pre class="code-block bg-gray-800 text-white p-2 rounded-md my-2 overflow-x-auto"><code>{escaped_code}</code></pre>'

    message_text = re.sub(r'```(.*?)```', replace_code_block, message_text, flags=re.DOTALL)

    # Bold and Italic (simple cases)
    message_text = re.sub(r'\*\*(.*?)\*\*', r'<strong>\1</strong>', message_text)
    message_text = re.sub(r'\_(.*?)\_', r'<em>\1</em>', message_text) # For _italic_
    message_text = re.sub(r'\*(.*?)\*', r'<em>\1</em>', message_text)   # For *italic*

    # Newlines to <br>
    return message_text.replace('\n', '<br>')


# --- Flask Routes ---
@app.route('/')
def index():
    """Serves the main chat page."""
    return render_template('index.html')

@app.route('/send_message', methods=['POST'])
def send_message_route():
    """Handles incoming user messages and returns bot responses."""
    global chat_session, api_configured

    if not api_configured:
        if not initialize_api(): # Try to re-initialize
            return jsonify({
                "error": "API not configured. Please check the server logs and API key.",
                "status": "API Error"
            }), 500

    user_input = request.json.get('message', '').strip()
    if not user_input:
        return jsonify({"error": "Empty message received."}), 400

    if not chat_session: # Should be initialized by initialize_api
        return jsonify({
            "error": "Chat session not available. API might be down.",
            "status": "Chat Session Error"
        }), 500

    try:
        # For streaming, Flask would need a different setup (e.g., Server-Sent Events or WebSockets)
        # For simplicity, we'll use a non-streaming response here.
        # If you need streaming, the approach needs to change significantly.
        response = chat_session.send_message(user_input)
        bot_response_text = response.text

        # Add to history (though genai SDK handles this for chat_session)
        # For explicit history management if needed:
        # chat_session.history.append({'role': 'user', 'parts': [{'text': user_input}]})
        # chat_session.history.append({'role': 'model', 'parts': [{'text': bot_response_text}]})

        formatted_bot_response = format_message_for_html(bot_response_text)

        return jsonify({
            "user_message": user_input,
            "bot_response": formatted_bot_response,
            "raw_bot_response": bot_response_text, # For copy functionality
            "timestamp": datetime.now().strftime("%H:%M:%S"),
            "status": "Success"
        })

    except Exception as e:
        print(f"Error processing message: {e}")
        # Attempt to provide a more specific error if known
        error_message = f"An error occurred: {str(e)}"
        if "API key not valid" in str(e):
            error_message = "API Key is not valid. Please check your API key."
            api_configured = False # Mark as not configured
        elif "DeadlineExceeded" in str(e) or "503" in str(e):
             error_message = "The service is currently unavailable or timed out. Please try again later."

        return jsonify({
            "error": error_message,
            "status": "Processing Error"
        }), 500

@app.route('/clear_chat_session', methods=['POST'])
def clear_chat_session_route():
    """Clears the current chat session history for the bot."""
    global chat_session, genai_model, api_configured
    if not api_configured or not genai_model:
        return jsonify({"error": "API or model not initialized.", "status": "API Error"}), 500
    try:
        chat_session = genai_model.start_chat(history=[]) # Start a new fresh chat
        print("Chat session cleared.")
        return jsonify({"message": "Chat session cleared successfully.", "status": "Success"})
    except Exception as e:
        print(f"Error clearing chat session: {e}")
        return jsonify({"error": f"Failed to clear chat session: {str(e)}", "status": "Error"}), 500

@app.route('/check_api_status', methods=['GET'])
def check_api_status_route():
    """Checks and returns the current API connection status."""
    global api_configured
    if api_configured and chat_session:
        return jsonify({"status_text": "Connected & Ready", "status_indicator_color": "bg-green-500", "connected": True})
    else:
        # Try to re-initialize if not configured
        if not api_configured:
            initialize_api() # Attempt to connect
        
        if api_configured and chat_session: # Check again after attempt
            return jsonify({"status_text": "Connected & Ready", "status_indicator_color": "bg-green-500", "connected": True})
        else:
            return jsonify({"status_text": "Disconnected - Check API Key/Server", "status_indicator_color": "bg-red-500", "connected": False})


if __name__ == '__main__':
    # Make sure the 'templates' and 'static' folders exist in the same directory as app.py
    # Or specify template_folder and static_folder in Flask constructor
    app.run(debug=True, host='0.0.0.0', port=5000)
