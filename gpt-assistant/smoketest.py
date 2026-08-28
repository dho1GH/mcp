from app_agents.persistent_agent import PersistentStateAgent

if __name__ == "__main__":
    agent = PersistentStateAgent()
    out = agent.handle(
        {
            "user_id": "default",
            "input": "Say hello and tell me whether memory is wired.",
        }
    )
    print(out)
