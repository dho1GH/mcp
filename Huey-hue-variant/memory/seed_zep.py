from zep_cloud.client import Zep
from zep_cloud.types import Message
import os
from dotenv import load_dotenv

load_dotenv()

zep = Zep(api_key=os.getenv("ZEP_API_KEY"))

user_id = "user_1"
session_id = "session_1"

# create user
zep.user.add(user_id=user_id)

# create session
zep.memory.add_session(user_id=user_id, session_id=session_id)

# add conversation
zep.memory.add(
    session_id=session_id,
    messages=[
        Message(
            role="user",
            role_type="user",
            content="I run a design agency."
        ),
        Message(
            role="assistant",
            role_type="assistant",
            content="Got it. I'll remember that."
        )
    ]
)

print("Data sent to Zep successfully")
