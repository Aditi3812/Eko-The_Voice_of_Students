from typing import List, Dict
from fastapi import WebSocket

#This class keeps track of all active browser windows connected to a specific document room and broadcasts changes across them.
class ConnectionManager:
    def __init__(self):
        # Stores active connections per room: { "CSE-301": [WebSocket1, WebSocket2] }
        self.active_rooms: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, room_id: str):
        await websocket.accept()
        if room_id not in self.active_rooms:
            self.active_rooms[room_id] = []
        self.active_rooms[room_id].append(websocket)
        print(f"🔌 Client connected to room: {room_id}. Total in room: {len(self.active_rooms[room_id])}")

    def disconnect(self, websocket: WebSocket, room_id: str):
        if room_id in self.active_rooms:
            self.active_rooms[room_id].remove(websocket)
            if len(self.active_rooms[room_id]) == 0:
                del self.active_rooms[room_id]
        print(f"❌ Client disconnected from room: {room_id}")

    async def broadcast(self, message: str, sender_websocket: WebSocket, room_id: str):
        """Sends message to all connected clients in the room EXCEPT the sender."""
        if room_id in self.active_rooms:
            for connection in self.active_rooms[room_id]:
                if connection != sender_websocket:
                    await connection.send_text(message)

manager = ConnectionManager()