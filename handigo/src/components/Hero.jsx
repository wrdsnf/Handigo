import charImg from '../assets/char1.png';
import Container from '@/components/Container';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Hero = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <header id="tentang" className="scroll-mt-20 sm:scroll-mt-24 pt-4 sm:pt-8 pb-12 md:py-20">
      <Container className="flex flex-col md:flex-row items-center justify-between gap-8 md:gap-10">
        <div className="max-w-xl text-center md:text-left">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-primary-blue leading-tight mb-4 sm:mb-6">
            Belajar Isyarat,<br />Bangun Koneksi.
          </h1>
          <p className="text-gray-500 mb-6 sm:mb-8 leading-relaxed text-sm sm:text-base">
            Belajar Bahasa Isyarat Gratis & Interaktif. Platform pembelajaran bahasa isyarat berbasis AI dengan umpan balik gerakan tangan secara real-time.
          </p>
          <button
            onClick={() => navigate(user ? "/dashboard" : "/register")}
            className="inline-block bg-primary-blue text-white px-8 py-3 rounded-full font-semibold hover:bg-primary-hover active:scale-95 transition-all mb-8 sm:mb-10 w-full sm:w-auto"
          >
            Mulai
          </button>

          <div className="flex flex-wrap justify-center md:justify-start gap-3 sm:gap-4 text-xs font-medium text-gray-500">
            <span className="border border-gray-300 rounded-full px-3 sm:px-4 py-2 flex items-center gap-2">✓ Gratis</span>
            <span className="border border-gray-300 rounded-full px-3 sm:px-4 py-2 flex items-center gap-2">✓ Feedback AI</span>
            <span className="border border-gray-300 rounded-full px-3 sm:px-4 py-2 flex items-center gap-2">✓ Tanpa Install</span>
          </div>
        </div>
        <div className="w-full md:w-1/2 flex justify-center md:justify-end">
          <img src={charImg} alt="Ilustrasi" className="rounded-3xl object-cover w-full max-w-xs sm:max-w-md" />
        </div>
      </Container>
    </header>
  );
};

export default Hero;
