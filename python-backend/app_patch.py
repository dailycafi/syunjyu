    # Run with uvicorn
    uvicorn.run(
        "app:app",
        host="127.0.0.1",
        port=8500,
        reload=True,  # Enable auto-reload during development
    )

@app.delete("/api/phrases/{phrase_id}")
async def delete_phrase(phrase_id: int):
    """Delete a phrase from learning library"""
    conn = db.get_connection()
    cursor = conn.cursor()
    
    cursor.execute(
        "UPDATE phrases SET deleted = 1 WHERE id = ?",
        (phrase_id,)
    )
    
    affected = cursor.rowcount
    conn.commit()
    conn.close()
    
    if affected == 0:
        raise HTTPException(status_code=404, detail="Phrase not found")
        
    return {"status": "success", "message": "Phrase deleted"}


if __name__ == "__main__":
    uvicorn.run("app:app", host="127.0.0.1", port=8500, reload=True)

