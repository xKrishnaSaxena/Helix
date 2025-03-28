FROM node:23

WORKDIR .

COPY package.json .

RUN npm install

COPY . .

EXPOSE 3002

EXPOSE 4000

CMD ["npm", "run", "dev"]

