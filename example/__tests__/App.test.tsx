/**
 * @format
 */

import 'react-native';
import * as React from 'react';
import VoiceTest from '../src/VoiceTest';

// Note: import explicitly to use the types shipped with jest.
import { it } from '@jest/globals';

// Note: test renderer must be required after react-native.
import { create } from 'react-test-renderer';

it('renders correctly', () => {
  create(<VoiceTest />);
});
