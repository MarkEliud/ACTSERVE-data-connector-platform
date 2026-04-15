import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach } from '@testing-library/react';

afterEach(() => {
  cleanup();
});