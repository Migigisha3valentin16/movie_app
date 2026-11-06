import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const navigate = useNavigate();

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    if (!response.ok) {
      setError(data.error || "Login failed");
      return;
    }

    localStorage.setItem("token", data.token);
    navigate("/admin");
    window.location.reload();
  }

  return (
    <main style={{ padding: 30 }}>
      <h1>Admin Login</h1>

      <form onSubmit={handleSubmit}>
        <div>
          <input
            placeholder="Username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
          />
        </div>

        <br />

        <div>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>

        <br />

        <button type="submit">Login</button>
      </form>

      {error && <p style={{ color: "red" }}>{error}</p>}
    </main>
  );
}