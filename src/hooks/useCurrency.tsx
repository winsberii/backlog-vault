import { useState, useEffect } from "react";

export const currencies = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'RUB', symbol: '₽', name: 'Russian Ruble' },
];

export const useCurrency = () => {
  const [selectedCurrency, setSelectedCurrency] = useState(() => {
    return localStorage.getItem('selectedCurrency') || 'USD';
  });

  useEffect(() => {
    localStorage.setItem('selectedCurrency', selectedCurrency);
  }, [selectedCurrency]);

  const currentCurrency = currencies.find(c => c.code === selectedCurrency) || currencies[0];

  const formatPrice = (price: number | null) => {
    if (!price) return '';
    return `${currentCurrency.symbol}${price.toFixed(2)}`;
  };

  return {
    selectedCurrency,
    setSelectedCurrency,
    currentCurrency,
    formatPrice,
    currencies,
  };
};