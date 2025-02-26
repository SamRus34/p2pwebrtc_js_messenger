import {BrowserRouter, Routes, Route} from 'react-router-dom';
import Room from './pages/Room';
import Main from './pages/Main';
import NotFound404 from './pages/NotFound404';

function App() {
  return (
      <BrowserRouter>
          <Routes>
              <Route path="room/:id" element={<Room />} />
              <Route path="/" element={<Main />} />
              <Route path="*" element={<NotFound404 />} />
          </Routes>
      </BrowserRouter>
  );
}

export default App;
