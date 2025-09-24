import React, { useState } from "react"
import { supabase } from "../supabaseClient"

export default function LoginPage({ onLogin }) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    setLoading(false)

    if (error) {
      setError(error.message)
    } else {
      onLogin(data.user)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white relative">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold">Inventory Management System</h1>
        <h2 className="text-xl text-blue-400 font-semibold mt-2">MAKS OS</h2>
      </div>

      {/* Login Form */}
      <form
        onSubmit={handleLogin}
        className="bg-gray-800 p-6 rounded-lg shadow-lg w-80"
      >
        <h3 className="text-2xl font-semibold mb-4 text-center">Login</h3>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full p-2 mb-3 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full p-2 mb-3 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        {error && <p className="text-red-500 mb-3">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 bg-blue-600 hover:bg-blue-700 rounded font-semibold transition"
        >
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>

      {/* Footer Support */}
      <div className="absolute bottom-4 text-center w-full text-gray-400 text-sm">
        For support contact:{" "}
        <a
          href="https://wa.me/03398619007"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:underline"
        >
          OUR WhatsApp 👈🏻
        </a>
      </div>
    </div>
  )
}
