import requests, json
url = "http://127.0.0.1:8000/api/topic/discover"
payload = {"query": "test"}
resp = requests.post(url, json=payload)
print("Status:", resp.status_code)
print("Response:", resp.text)
