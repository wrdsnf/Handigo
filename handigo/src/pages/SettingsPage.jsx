import Container from '@/components/Container';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const SettingsPage = () => {
  const navigate = useNavigate();
  const { user, updateProfile } = useAuth();

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || '',
        email: user.email || '',
        password: '',
      });
    }
  }, [user]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Nama tidak boleh kosong');
      return;
    }
    setIsSubmitting(true);
    try {
      await updateProfile({
        name: form.name,
        password: form.password || undefined,
      });
      navigate('/profile');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-white text-gray-800 antialiased pt-6 pb-20">
      <Container>

        {/* BACK */}
        <button onClick={() => navigate(-1)} className="text-sm text-gray-500 mb-6 hover:underline cursor-pointer">
          ← Kembali
        </button>

        <h2 className="text-xl font-semibold mb-6">Edit Profil</h2>

        {/* FORM */}
        <div className="flex flex-col gap-4">

          <Input
            label="Nama Lengkap"
            name="name"
            value={form.name}
            onChange={handleChange}
          />

          <div>
            <p className="text-xs text-gray-500 mb-1">Email</p>
            <input
              value={form.email}
              disabled
              className="w-full px-4 py-2 rounded-full bg-gray-100 text-sm text-gray-400 cursor-not-allowed"
            />
            <p className="text-[10px] text-gray-400 mt-1">Email tidak dapat diubah</p>
          </div>

          <Input
            label="Password Baru"
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            placeholder="Kosongkan jika tidak ingin ganti"
          />

        </div>

        {/* SAVE */}
        <button
          onClick={handleSave}
          disabled={isSubmitting}
          className="w-full bg-primary-blue text-white py-3 rounded-full mt-8 hover:bg-primary-hover active:scale-95 transition-all duration-200 disabled:opacity-50 font-semibold"
        >
          {isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}
        </button>

      </Container>
    </div>
  );
};

const Input = ({ label, ...props }) => (
  <div>
    <p className="text-xs text-gray-500 mb-1">{label}</p>
    <input
      {...props}
      className="w-full px-4 py-2 rounded-full bg-light-blue text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue"
    />
  </div>
);

export default SettingsPage;