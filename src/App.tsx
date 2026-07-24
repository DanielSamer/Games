import { Routes, Route } from "react-router-dom";
import { MainMenu } from "./pages/MainMenu";
import { AuthPage } from "./pages/AuthPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { FamilyFeudLobby } from "./pages/FamilyFeudLobby";
import { FamilyFeudPlay } from "./pages/FamilyFeudPlay";
import { ChaserLobby } from "./pages/ChaserLobby";
import { ChaserPlay } from "./pages/ChaserPlay";
import { GameStub } from "./pages/GameStub";
import { DblOrNothingLobby } from "./pages/DblOrNothingLobby";
import { DblOrNothingHost } from "./pages/DblOrNothingHost";
import { DblOrNothingJoin } from "./pages/DblOrNothingJoin";
import { RequireAuth } from "./components/RequireAuth";
import { RequireAdmin } from "./components/RequireAdmin";
import { AdminDashboard } from "./pages/AdminDashboard";

function App() {
  return (
    <Routes>
      <Route path="/" element={<MainMenu />} />
      <Route path="/sign-in" element={<AuthPage mode="signIn" />} />
      <Route path="/sign-up" element={<AuthPage mode="signUp" />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />

      <Route
        path="/family-feud"
        element={
          <RequireAuth>
            <FamilyFeudLobby />
          </RequireAuth>
        }
      />
      <Route
        path="/family-feud/:gameId"
        element={
          <RequireAuth>
            <FamilyFeudPlay />
          </RequireAuth>
        }
      />
      <Route
        path="/chaser"
        element={
          <RequireAuth>
            <ChaserLobby />
          </RequireAuth>
        }
      />
      <Route
        path="/chaser/:gameId"
        element={
          <RequireAuth>
            <ChaserPlay />
          </RequireAuth>
        }
      />
      <Route
        path="/double-or-nothing"
        element={
          <RequireAuth>
            <DblOrNothingLobby />
          </RequireAuth>
        }
      />
      <Route
        path="/double-or-nothing/host/:roomId"
        element={
          <RequireAuth>
            <DblOrNothingHost />
          </RequireAuth>
        }
      />
      {/* Public — players reach this by scanning a QR code, no account needed */}
      <Route path="/don/:code" element={<DblOrNothingJoin />} />
      <Route
        path="/admin"
        element={
          <RequireAuth>
            <RequireAdmin>
              <AdminDashboard />
            </RequireAdmin>
          </RequireAuth>
        }
      />
      <Route
        path="/never-have-i-ever"
        element={
          <RequireAuth>
            <GameStub title="I Didn't Do It" titleAr="عمري ما" theme="nhie" />
          </RequireAuth>
        }
      />
    </Routes>
  );
}

export default App;
