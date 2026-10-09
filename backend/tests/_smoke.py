from sqlalchemy import create_engine, text

with create_engine("sqlite:///./dev.db").connect() as conn:
    rows = conn.execute(text("select name from sqlite_master where type='table'")).fetchall()
print([r[0] for r in rows])