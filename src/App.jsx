import { Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout.jsx'
import { PantryProvider } from './context/PantryContext.jsx'
import { FavouritesProvider } from './context/FavouritesContext.jsx'
import Home from './pages/Home.jsx'
import NotFound from './pages/NotFound.jsx'

export default function App() {
  return (
    <PantryProvider>
      <FavouritesProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </FavouritesProvider>
    </PantryProvider>
  )
}
