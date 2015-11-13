FROM ruby

RUN gem install sinatra
RUN gem install sinatra-contrib
RUN gem install rubocop

RUN mkdir /code
ADD . /code/

WORKDIR /code
CMD ruby web.rb -o 0.0.0.0