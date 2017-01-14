FROM node:6

WORKDIR /app

RUN useradd -ms /bin/bash multilevel
RUN chown multilevel:multilevel /app

ADD index.js /app
ADD package.json /app

RUN npm install

ENTRYPOINT ["npm", "start"]
