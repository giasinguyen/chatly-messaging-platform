export const Footer = () => {
  return (
    <footer className="bg-[#0d3b7a] py-10 text-center text-sm text-[#b8c8e8]">
      <div className="container">
        <nav className="flex flex-col md:flex-row md:justify-center gap-6 mt-6">
          <a href="#">Terms</a>
          <a href="#">Privacy</a>
        </nav>
        <p className="mt-6">
          &copy; 2026 The Challenger Team. All rights reserved.
        </p>
      </div>
    </footer>
  );
};
