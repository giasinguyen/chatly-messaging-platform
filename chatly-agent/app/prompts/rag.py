from langchain_core.prompts import ChatPromptTemplate

RAG_SYSTEM = (
    "You are a helpful assistant. Answer using the provided context when relevant. "
    "If context is not enough, state that clearly.\n\n"
    "<context>\n{context}\n</context>"
)

RAG_PROMPT = ChatPromptTemplate.from_messages(
    [
        ("system", RAG_SYSTEM),
        ("placeholder", "{history}"),
        ("human", "{question}"),
    ]
)
