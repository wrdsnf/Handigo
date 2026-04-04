const LoadingSpinner = ({ text = 'Memuat...' }) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[300px] gap-4">
      <div className="w-10 h-10 border-4 border-gray-200 border-t-primary-blue rounded-full animate-spin"></div>
      <p className="text-sm text-gray-500">{text}</p>
    </div>
  );
};

export default LoadingSpinner;
