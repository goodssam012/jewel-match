import { useEffect, useState } from 'react';

// 레벨 업, 섞기 알림. text가 null이 되어도 사라지는 동안은 마지막 글자를 유지한다.
export default function Banner({ text }) {
  const [shown, setShown] = useState('');
  useEffect(() => {
    if (text) setShown(text);
  }, [text]);
  return <div className={`banner${text ? ' show' : ''}`}>{shown}</div>;
}
