import { Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout.jsx'
import { PantryProvider } from './context/PantryContext.jsx'
import { FavouritesProvider } from './context/FavouritesContext.jsx'
import { ShoppingProvider, useShopping } from './context/ShoppingContext.jsx'
import Home from './pages/Home.jsx'
import Browse from './pages/Browse.jsx'
import Recipe from './pages/Recipe.jsx'
import NotFound from './pages/NotFound.jsx'

export default function App() {
  return (
    <PantryProvider>
      <FavouritesProvider>
        <ShoppingProvider>
          <AppRoutes />
        </ShoppingProvider>
      </FavouritesProvider>
    </PantryProvider>
  )
}

function AppRoutes() {
  const { remaining } = useShopping()
  return (
    <Routes>
      <Route element={<Layout badges={{ '/shopping': remaining }} />}>
        <Route index element={<Home />} />
        <Route path="browse" element={<Browse />} />
        <Route path="recipe/:id" element={<Recipe />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
