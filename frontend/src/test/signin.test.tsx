import * as React from 'react';
import { mount, shallow } from 'enzyme';
import SignUpForm from '../components/SignUpForm';
import APIClient from '../api';
import { User } from '../../../common/models';
import { labelNames } from '../types';
import '../bindings';
import renderer from 'react-test-renderer';
import App from '../../App';
import PopUpMessage from '../components/PopUpMessage';
import { TextInput } from 'react-native-paper';

var enzyme = require('enzyme');
var Adapter = require('enzyme-adapter-react-16');

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

/* for some reason this shit doesnt work!!
it('should render the sign up page without crashing', () => {
  const rendered = renderer.create(<App/>).toJSON();
  expect(rendered.children.length).toBe(1);
});*/

test('sign up testing', () => {
  mockedAPIClient.signUp.mockResolvedValue(fakeUser);

  const navigate = jest.fn();
  let navigation = { navigate } as any;
  const signup = shallow(<SignUpForm navigation={navigation} />);

  // check that we can even grab it
  expect(signup.find({label: labelNames.firstname})).toHaveLength(1);
  // try to change this textinput value (aka 'fill it in')
  signup.find(TextInput).at(0).simulate('changeText', 'Charlie');
  console.log("look at this", signup.find(TextInput).at(0));
  //signup.find({ label: labelNames.firstname}).simulate('changeText', 'Charlie');
  //expect(signup.state('firstName')).toEqual(fakeUser.name);
  //console.log(signup.find({ label: labelNames.firstname}).text());
  //expect(signup.find({ label: labelNames.firstname})).toEqual(fakeUser.name);
});

/*test('trying to sign up', () => {
  mockedAPIClient.signUp.mockResolvedValue(fakeUser);

  const navigate = jest.fn();
  let navigation = { navigate } as any;
  const instanceOf = renderer.create(<SignUpForm navigation={navigation} />).getInstance();
  console.log(instanceOf);

  instanceOf.setFirstName('Charlie');
  expect(instanceOf.state.firstName).toEqual(fakeUser.name);
});*/