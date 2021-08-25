import * as React from 'react';
import { shallow } from 'enzyme';
import SignUpForm from '../components/SignUpForm';
import APIClient from '../api';
import { User } from '../../../common/models';
import { labelNames } from '../types';
var enzyme = require('enzyme');
var Adapter = require('enzyme-adapter-react-15');

enzyme.configure({ adapter: new Adapter() })

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

// import React from "react";
// import renderer from "react-test-renderer";

// import App from "./App";

// describe("<App />", () => {
//   it("has 1 child", () => {
//     const tree = renderer.create(<App />).toJSON();
//     // @ts-ignore
//     expect(tree.children.length).toBe(1);
//   });
// });