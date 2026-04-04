import { useNavigate } from "react-router-dom";
import Container from '@/components/Container';
import { useAuth } from '../context/AuthContext';

const Cta = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <section className="text-center mb-16 md:mb-20">
      <Container>
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-primary-blue mb-6 sm:mb-8 md:mb-10 leading-tight px-2">
          Mulai perjalanan belajarmu sekarang.<br className="hidden sm:block" />Gratis, selamanya.
        </h2>

        <button
          className="bg-primary-blue text-white px-6 sm:px-8 py-3 sm:py-4 rounded-full font-bold hover:bg-primary-hover active:scale-95 transition-all w-full sm:w-auto text-sm sm:text-base"
          onClick={() => navigate(user ? "/dashboard" : "/register")}
        >
          {user ? "Lanjutkan Belajar" : "Daftar Sekarang — Gratis"}
        </button>
      </Container>
    </section>
  );
};

export default Cta;