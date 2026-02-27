import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabase';

const ThemeContext = createContext({
  color: '#2D5A27', // Verde por defecto
  updateColor: (newColor: string) => {},
});

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [color, setColor] = useState('#2D5A27');

  // Cargar el color del perfil cuando inicia la app
  useEffect(() => {
    loadUserConfig();
  }, []);

  async function loadUserConfig() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('perfiles')
        .select('color_preferido')
        .eq('id', user.id)
        .single();
      
      if (data?.color_preferido) setColor(data.color_preferido);
    }
  }

  const updateColor = async (newColor: string) => {
    setColor(newColor);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('perfiles').update({ color_preferido: newColor }).eq('id', user.id);
    }
  };

  return (
    <ThemeContext.Provider value={{ color, updateColor }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);