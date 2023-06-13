import axios from 'axios';

type Style = {
  id: number;
  name: string;
};

(async () => {
  const { data } = await axios({
    method: 'get',
    url: 'https://api.luan.tools/api/styles',
  });
  const styles = data
    .map(({ id, name }: Style) => ({ id, style: name }))
    .sort((a: Style, b: Style) => a.id - b.id);
  console.log(JSON.stringify(styles, null, 4));
})();
