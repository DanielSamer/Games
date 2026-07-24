import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { getDeviceToken } from "../utils/deviceToken";
import { getPlayerSession, savePlayerSession } from "../utils/playerSession";
import { Bi } from "../components/Bi";
import { DblOrNothingPlay } from "../components/dblOrNothing/DblOrNothingPlay";

export function DblOrNothingJoin() {
  const { code } = useParams<{ code: string }>();
  const room = useQuery(api.rooms.getByCode, code ? { code } : "skip");
  const joinRoom = useMutation(api.players.joinRoom);

  const [nickname, setNickname] = useState("");
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<{ playerId: string; secret: string; roomId: string } | null>(
    null,
  );

  useEffect(() => {
    if (!room) return;
    const existing = getPlayerSession(room.roomId);
    if (existing) {
      setSession({ playerId: existing.playerId, secret: existing.secret, roomId: room.roomId });
    }
  }, [room]);

  if (!code) {
    return (
      <div className="page-center don-theme">
        <p>Missing room code.</p>
      </div>
    );
  }

  if (room === undefined) {
    return (
      <div className="page-center don-theme">
        <p className="loading-text">
          <Bi en="Looking for room…" ar="بندور على الغرفة..." />
        </p>
      </div>
    );
  }

  if (room === null) {
    return (
      <div className="page-center don-theme">
        <div className="stub-card">
          <h1 className="stub-title">
            <Bi en="Room not found" ar="الغرفة مش موجودة" />
          </h1>
          <p className="stub-desc">
            <Bi en="Double-check the code with your host." ar="اتأكد من الكود مع المُقدِّم." />
          </p>
        </div>
      </div>
    );
  }

  if (session) {
    return (
      <DblOrNothingPlay
        roomId={session.roomId as Id<"rooms">}
        playerId={session.playerId as Id<"players">}
        secret={session.secret}
      />
    );
  }

  const handleJoin = async () => {
    const trimmed = nickname.trim();
    if (!trimmed) return;
    setJoining(true);
    setError(null);
    try {
      const deviceToken = getDeviceToken();
      const result = await joinRoom({ code, nickname: trimmed, deviceToken });
      savePlayerSession(result.roomId, {
        playerId: result.playerId,
        secret: result.secret,
        nickname: trimmed,
      });
      setSession({ playerId: result.playerId, secret: result.secret, roomId: result.roomId });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not join the room.");
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="page-center don-theme">
      <form
        className="menu-auth-card"
        onSubmit={(e) => {
          e.preventDefault();
          void handleJoin();
        }}
      >
        <h1 className="menu-auth-title">
          <Bi en="Double or Nothing" ar="ضاعف أو اخسر" />
        </h1>
        <p className="menu-auth-subtitle">
          <Bi en="Pick a nickname to join the room." ar="اختار اسم مستعار للانضمام للغرفة." />
        </p>
        <label className="menu-auth-field">
          <span>
            <Bi en="Nickname" ar="الاسم المستعار" />
          </span>
          <input
            type="text"
            required
            maxLength={24}
            autoFocus
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
          />
        </label>
        {error && <p className="menu-auth-error">{error}</p>}
        <button type="submit" className="menu-auth-submit" disabled={joining || !nickname.trim()}>
          {joining ? <Bi en="Joining…" ar="جاري الانضمام..." /> : <Bi en="Join" ar="انضم" />}
        </button>
      </form>
    </div>
  );
}
