import { Routes, Route, Link } from 'react-router-dom'
import Crear from './pages/Crear'
import Stats from './pages/Stats'
import Sala from './pages/Sala'
export default function App() {
  return (
    <div className="mx-auto min-h-screen max-w-md px-4 pb-16">
      <header className="flex items-center justify-between py-4">
        <Link to="/" className="text-xl font-black tracking-tight">
          <span className="text-red-600">FULBITO</span> ROJIBLANCO
        </Link>
        <Link to="/stats" className="text-sm font-bold text-amber-400">🏆 Tablas</Link>
      </header>
      <Routes>
        <Route path="/" element={<Crear />} />
        <Route path="/stats" element={<Stats />} />
        <Route path="/partido/:id" element={<Sala />} />
      </Routes>
    </div>
  )
}
