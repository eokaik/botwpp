const mysql = require('mysql2/promise');
const fs = require('fs');
const wppconnect = require('@wppconnect-team/wppconnect');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'sisescola',
  port: 3306,
};

async function getAlunos(matricula) {
  const connection = await mysql.createConnection(dbConfig);

  try {
    const [rows] = await connection.execute('SELECT nome FROM aluno WHERE idaluno = ?', [matricula]);

    if (rows.length > 0) {
      const listaDeAlunos = rows.map((row) => row.nome);
      return listaDeAlunos;
    } else {
      return [];
    }
  } catch (error) {
    console.error('Erro na consulta: ' + error);
    return [];
  } finally {
    connection.end();
  }
}

wppconnect
  .create({
    session: 'sessionName',
    catchQR: (base64Qr, asciiQR) => {
      console.log(asciiQR);
      var matches = base64Qr.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      var response = {};

      if (matches.length !== 3) {
        return new Error('Invalid input string');
      }
      response.type = matches[1];
      response.data = new Buffer.from(matches[2], 'base64');

      var imageBuffer = response;
      require('fs').writeFile(
        'out.png',
        imageBuffer['data'],
        'binary',
        function (err) {
          if (err != null) {
            console.log(err);
          }
        }
      );
    },
    logQR: false,
  })
  .then((client) => start(client))
  .catch((error) => console.log(error));

function start(client) {
  let hasSentWelcomeMessage = false;
  let hasRequestedMatricula = false;
  let hasSentAlunosMessage = false;

  client.onMessage(async (message) => {
    if (!hasSentWelcomeMessage) {
      await client.sendText(
        message.from,
        '🥰 *Olá, Como Vai?*\n\n *Eu sou Izzy, a assistente virtual do CETEP.*\n\n ☝️🤨 _*Como posso te ajudar?*_ \n\n 1️⃣ *- Data de matrícula;*\n 2️⃣ *- Informações sobre os cursos;*\n 3️⃣ *- Recebimento de Atestado;*\n 4️⃣ *- Atendimento direto;*\n 5️⃣ *- Encerrar atendimento*\n'
      );
      hasSentWelcomeMessage = true;
    } else {
      switch (message.body) {
        case '1':
          if (!hasRequestedMatricula) {
            await client.sendText(message.from, 'Por favor, digite sua matrícula:');
            hasRequestedMatricula = true;
          }

          client.onMessage(async (matriculaMessage) => {
            if (matriculaMessage.body && !hasSentAlunosMessage) {
              const matricula = matriculaMessage.body;

              getAlunos(matricula)
                .then((alunos) => {
                  if (alunos.length > 0) {
                    const listaAlunos = 'Nomes dos alunos: ' + alunos.join(', ');
                    client.sendText(message.from, listaAlunos);
                    console.log(listaAlunos);
                    hasSentAlunosMessage = true;
                  } else {
                    client.sendText(message.from, 'Nenhum aluno encontrado.');
                    console.log('Nenhum aluno encontrado.');
                  }
                })
                .catch((error) => {
                  console.error('Erro: ' + error);
                });
            }
          });
          break;
        case '2':
          await client.sendText(message.from, 'Informações sobre cursos...');
          break;
        case '3':
          await client.sendText(message.from, 'Instruções para o atestado...');
          break;
        case '4':
          await client.sendText(message.from, 'Informações de contato...');
          break;
        case '5':
          await client.sendText(message.from, '🥰 *Obrigado pela conversa, até logo* 👋');
          break;
        case '6':
          await client.sendText(message.from, 'Resposta da 6ª opção.');
          break;
        default:
          break;
      }
    }
  });
}
