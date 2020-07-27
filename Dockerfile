FROM node:latest

RUN mkdir /code
WORKDIR /code

RUN apt-get update
RUN npm install -g nodemon

COPY package*.json ./

RUN npm install

COPY . .

RUN ["chmod", "+x", "/code/entry-point.sh"]

ENTRYPOINT ["/code/entry-point.sh"] 