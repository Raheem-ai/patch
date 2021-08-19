import * as React from 'react';
import { shallow } from 'enzyme';
import SignUpForm from '../components/SignUpForm';
import APIClient from '../api';
import { User } from '../../../common/models';
import { labelNames } from '../types';

jest.mock('../api');
const mockedAPIClient = APIClient as jest.Mocked<typeof APIClient>;

const fakeUser: User = {
  id: '0000',
  roles: [],
  name: 'Charlie',
  email: 'test@test.com',
  password: 'Test',
}

test('sign up testing', () => {
  mockedAPIClient.signUp.mockResolvedValue(fakeUser);

  const navigate = jest.fn();
  let navigation = { navigate } as any;
  const signup = shallow(<SignUpForm navigation={navigation} />);

  // fill out the text input values for new user
  signup.find({ label: labelNames.firstname}).simulate('changeText', fakeUser.name);

  expect(signup.text()).toEqual(fakeUser.name);
});