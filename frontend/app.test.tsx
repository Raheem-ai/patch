import { render, screen, fireEvent } from '@testing-library/react-native';
import App from './App';

test('form submits two answers', () => {
    // const mockFn = jest.fn();
  
    render(<App/>);
  
    // const answerInputs = screen.getAllByLabelText('answer input');
  
    // fireEvent.changeText(answerInputs[0], 'a1');
    // fireEvent.changeText(answerInputs[1], 'a2');
    // fireEvent.press(screen.getByText('Submit'));
  
    // expect(mockFn).toBeCalledWith({
    //   '1': { q: 'q1', a: 'a1' },
    //   '2': { q: 'q2', a: 'a2' },
    // });
});