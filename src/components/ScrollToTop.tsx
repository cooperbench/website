import React, { useEffect, useState } from 'react';

export default function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.pageYOffset > 400) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);

    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  return (
    <button
      onClick={scrollToTop}
      className={`fixed bottom-8 right-8 w-10 h-10 bg-gray-900 text-white rounded-full transition-all duration-300 z-50 flex items-center justify-center text-sm shadow-lg hover:bg-gray-800 ${
        isVisible ? 'opacity-100 visible' : 'opacity-0 invisible'
      }`}
      title="Scroll to top"
    >
      <i className="fas fa-chevron-up"></i>
    </button>
  );
}
