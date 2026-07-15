import { Routes, Route } from "react-router-dom";
import { MainMenu } from "./pages/MainMenu";
import { AuthPage } from "./pages/AuthPage";
import { FamilyFeudLobby } from "./pages/FamilyFeudLobby";
import { FamilyFeudPlay } from "./pages/FamilyFeudPlay";
import { ChaserLobby } from "./pages/ChaserLobby";
import { ChaserPlay } from "./pages/ChaserPlay";
import { GameStub } from "./pages/GameStub";
import { RequireAuth } from "./components/RequireAuth";

function App() {
  return (
    <Routes>
      <Route path="/" element={<MainMenu />} />
      <Route path="/sign-in" element={<AuthPage mode="signIn" />} />
      <Route path="/sign-up" element={<AuthPage mode="signUp" />} />

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
