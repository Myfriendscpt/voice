/**
 * @format
 */

import 'react-native';
import React from 'react';
import VoiceTest from '../src/VoiceTest';

// Note: import explicitly to use the types shipped with jest.
import {it} from '@jest/globals';

// Note: test renderer must be required after react-native.
import renderer from 'react-test-renderer';

it('renders correctly', () => {
  renderer.create(<VoiceTest />);
});

