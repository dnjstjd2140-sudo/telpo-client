import { Route, Routes } from 'react-router-dom'

import { HomePage } from '@/pages/HomePage'
import { TripEditPage } from '@/pages/TripEditPage'
import { TripSharePage } from '@/pages/TripSharePage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/t/:editToken" element={<TripEditPage />} />
      <Route path="/s/:shareToken" element={<TripSharePage />} />
    </Routes>
  )
}

export default App
