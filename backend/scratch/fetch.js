const url = 'https://quiz-python-parser.onrender.com/parse-document';
fetch(url, { method: 'POST' })
  .then(res => res.text())
  .then(text => console.log(text.substring(0, 1000)))
  .catch(err => console.error(err));
