import Navbar from './Navbar'

function MainLayout({ children }) {
  return (
    <div className="min-vh-100 bg-body-tertiary">
      <Navbar />
      <main className="container py-4">{children}</main>
    </div>
  )
}

export default MainLayout
