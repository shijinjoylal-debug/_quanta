from flask import Flask, request, jsonify
from flask_cors import CORS
from transformers import pipeline

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Load the GPT-neo model once at startup
print("Loading GPT-Neo model...")
generator = pipeline(
    "text-generation",
    model="gpt-neo-125M"  
)
print("Model loaded successfully.")

@app.route('/generate', methods=['POST'])
def generate_text():
    data = request.json
    user_input = data.get('content', '')
    
    if not user_input:
        return jsonify({"error": "No input provided"}), 400

    prompt = f"{user_input}\nContinue the content:\n"
    
    try:
        output = generator(
            prompt,
            max_new_tokens=100,  # Focus on generating new content
            temperature=0.8,
            truncation=True,
            repetition_penalty=1.2,
            top_k=50,
            top_p=0.95,
            do_sample=True # Explicitly enable sampling for temperature/top_k/top_p to work
        )
        generated_text = output[0]["generated_text"]
        # Remove the prompt from the output to only show the continuation if desired
        # response_text = generated_text.replace(prompt, "").strip()
        return jsonify({"generated_text": generated_text})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(port=5001, debug=True)
