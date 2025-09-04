import requests

def ask_question(question):
    response = requests.post(
        "http://10.20.65.205:1234/v1/chat/completions",
        headers={"Content-Type": "application/json"},
        json={
            "model": "local-model-name",  
            "messages": [
                {"role": "user", "content": question}
            ],
            "max_tokens": 100
        }
    )
    
    result = response.json()
    if 'choices' in result and len(result['choices']) > 0:
        return result['choices'][0]['message']['content']
    else:
        return "Error: No response received"


print("Chat with AI (type 'quit' to exit)")
print("-" * 40)

while True:

    user_question = input("\nYou: ").strip()
    

    if user_question.lower() in ['quit', 'exit', 'bye']:
        print("Goodbye!")
        break
    

    if not user_question:
        continue
    

    print("AI: ", end="")
    try:
        response = ask_question(user_question)
        print(response)
    except Exception as e:
        print(f"Error: {e}")
