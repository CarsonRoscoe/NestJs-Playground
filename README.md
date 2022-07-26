# Best Practices

## Endpoints

Controllers should encompass one thing

Sibling endpoints (GET/POST/PATCH/DELETE with identical paths) can exist, and must represent the fetching or manipulation of the same concept

A lack of ID specifying that sibling endpoint generally means all, except for Post, which means the id does not exist as you're creating it

```ts
@Get()
findAll() {}

@Patch()
updateMany(@Body body) {}

@Delete()
deleteMany(@Body body) {}

@Get(':id')
findOne(@Param('id') id: string) {}

@Post()
addOne(@@Body body) {}

@Patch(':id')
updateOne(@Param('id') id: @Body body) {}

@Delete(':id')
deleteOne(@Param('id') id: string) {}
```

## Parameters

Path parameters should identify a resource
i.e. /phygital/:chainId/:contractAddress/:tokenId identifiers which specific Phygital is being referred to

Query parameters should filter or sort that resource
i.e. /phygital with params `{ chainId, contractAddress, sort }` should filter down to the list of tokens being requested and sort them

Body parameters should specify data being mutated
i.e. /phygitals with a body { chainId, contractAddress, tokenId } should denote adding/updating/deleting that data

All together, if we were updating the name of a container object who returns the complete container after updating, the parameters might look like:

```ts
@Patch('id')
updateContainer(@Param('id') id: string, @Body() body, @Query() query) {
    const { name } = body
    const { sort, filter } = query
    this.service.update(id, name)
    let container = this.service.get(id)
    if (sort) {
        data.entries.sort()
    }
    if (filter) {
        data = data.entries.filter(filter)
    }
    return data
}

```

## Separation of Controllers vs Services

Controllers are the endpoint, where user requests and responses are handled

Services are the meat of the logic, where any interaction with data sources are handled

You can generate a controller via the CLI:

```
nest g controller name
```

as well as a Service via

```
nest g service name
```

which both belong in the module, you generate via

```
nest g module name
```

## Errors

```ts
throw 'Error message';
```

will have a endpoint return a error 500 "Internal server error". The error message thrown will NOT show up.

Better error handling is done by throwing a HttpException(errorMessage, errorCode). For example, a service might throw a:

```ts
throw new HttpException(`Phygital not found`, HttpStatus.NOT_FOUND);
```

Services should be throwing these errors if appropriate, rather than Controllers. This is because the Service knows WHAT went wrong and can better determine what error message to handle. If the service returns default data, the controller will not be able to discern genuine default/empty data cases from handled cases.

See below for how we can use Exception Filters to even further improve error handling

## Data Transfer Objects

Data transfer objects (dto) are a way to make sure the request payload has the form needed before making a request.

They should exist within a dto subfolder of their modules' subfolder.

The file is named via "action"-name, such as create-coffee or update-coffee, suffixed with .dto to make it clear what they are.

You can generate one via the CLI:

```
nest g class moduleName/dto/action-name.dto.ts
```

Classes are similar, but in capital case. E.g. ActionNameDto would be the class behind the action-name.dto.ts file

It is best practice to make all the properties of a DTO readonly, as they should not be manipulated.

```ts
export class ActionNameDto {
  readonly name: string;
  readonly brand: string;
  readonly flavours: string[];
}
```

## Validate Input Data

Within DTO's, it's important to validate the incoming data for correctness. This is done via the ValidationPipes.

We configure this during application bootstraping via:

```ts
new ValidationPipe({
  whitelist: true, // Unwanted properties are removed from a dto
  forbidNonWhitelisted: true, // Error 400 if a unwanted property is detected
  transform: true, // Transform body's into a instance of the DTO & transforms simple type casting if needed. Defaults to just matching the form, but not type
}),
```

and can use them within a DTO via attributes such as:

```ts
export class ActionNameDto {
  @IsString()
  readonly name: string;
  @IsString()
  readonly brand: string;
  @IsString({ each: true })
  readonly flavours: string[];
}
```

If the global ValidationPipe has "transform" set to true, @Pipe attributes on Controller methods are unnecesary for simple types.

For example, if you are taking in a id param, usually that defaults to a string and requires a pipe to transform into a int. With the global ValidationPipe having transform enabled, you can just declare the type is a number in the method params and that casting will be done for you. No need to add a additional pipe.

## PartialTypes in DTO

Using PartialType from @nestjs/mapped-types, we can create Dto's that inherit from another Dto, however set all properties to be nullable.

This is useful to patch/update dto's to reduce code duplication. This will inherit validation pipe rules from the parent.

```ts
export class UpdateNameDto extends PartialType(CreateNameDto) {
  @IsNumber()
  id: number;
}
```

## Custom Dependency Injecting

The dependency injection system of Nest supports injecting anything through a modules provider.

### useValue

This feature is frequently used during testing, where a provider in it's lowest level is the following object:

```json
{
 provider: ClassName,
 useValue: new ClassName())
}
```

This can be extended to not just inject classes, but raw data. For example, if we wanted to make "ChainIds" an injectable thing concept, so our prod/dev/test environments can rely on different chains, we can inject by declaring the following provider in our modules:

```json
{
  "provider": "CHAINS",
  "useValue": [1, 10, 137]
}
```

with the Service now injecting via adding to the constructor

```ts
@Inject("CHAINS") chains: nuber[],
```

### useClass

If we want to inject a new instance of a class, we can useClass

### useFactory

To create providers dynamically, we can use the useFactory function. We use this over useClass or useValue when the thing we're instantiating has dependencies of its own, as useFactory can itself do dependency injection.

```ts
{
  provide: "CHAINS",
  useFactory: (chainFactory: ChainFactory) => chainFactory.getSupportedChains(process.env.NODE_ENV),
  inject: [ChainFactory]
},
```

## Asynchronous Providers

Sometimes we don't want everything to be injected at once. For example, we might want a service to not be callable until a database connection has been established, and don't want that controller to be callable until that service is ready.

```ts
{
  provide: "CHAINS",
  useFactory: async (chainFactory: ChainFactory) => {
    await chainFactory.getSupportedChains(process.env.NODE_ENV)
  },
  inject: [ChainFactory]
},
```

And that's it! We re-use the useFactory pattern, and just make the function async. Anything depending on "CHAINS" will not be instantiated until this completes.

That means, if ChainFactory had a db connection to determine this, nothing would be setup until that db connection was established. We also could just wait on ChainFactory/the db connection being completed.

## Dynamic Modules

Unused in the application, but see src/database/database.module.ts for an example of a dynamic module.

Essentially this is a factory for creating dynamic modules where the caller can determine the inputs. In the calling modules, you just have to say:

```ts
@Module({
  imports: [
    DatabaseModule.register({
      //args
    }),
  ],
  providers: [SomeController],
})
export class SomeModule {}
```

## Providers Scope

By default, every Provider (service) is a singleton. If we want to change that, we can pass options into the @Injectable attribute

```ts
@Injectable({ scope: Scope.TRANSIENT })
export class SomeService {}
```

#### Scopes

**Singleton (Scope.DEFAULT)**
One is created for the entire application

Always recommended for performance.

**Transient (Scope.TRANSIENT)**
One is created per consumer

**Request (Scope.REQUEST)**
One is created per request and immediately garbage collected after

_NOTE:_ Scope bubbles up. This means if a Controller depends on a Service whose scope is REQUEST, a new controller will also be created per request. Not only that, but any Guards, Intereceptors, Pipes or Filters used will also need to be recreated.

Also, REQUEST scoped providers/controllers have access to the original Request object. This is useful if you want access to header specific information, such as cookies, headers, IP, etc.

```ts
@Inject(REQUEST) private readonly request: Request
```

Request scoped providers will have an impact on performance. This may slow down response time.

#### Custom Providers

If you have a custom provider, scope is declared as another variable:

```ts
{
  provide: "CHAINS",
  useFactory: (chainFactory: ChainFactory) => chainFactory.getSupportedChains(process.env.NODE_ENV),
  inject: [ChainFactory]
  scope: Scope.REQUEST
}
```

## Validating ENV Vars

Nest can check the validity of a loaded env var

By default, everything in the .env file is optional

To add required parameters, type-safety, set defaults or more, update the ConfigModule in app.module.ts to set a Joi object in validateSchema.

```ts
ConfigModule.forRoot({
  validationSchema: Joi.object({
    DATABASE_HOST: Joi.required(),
    DATABASE_PORT: Joi.number().default(5432),
  }),
}),
```

We can take it a step further and create a object that loads our env variables. This gives us full control over using any logic to control it.

```ts
// In its own app.config.ts class
export default () => ({
  environment: process.env.NODE_ENV || 'development',
  database: {
    host: process.env.DATABASE_HOST,
    port: parseInt(process.env.DATABASE_PORT, 10) || 5432,
  },
});

// In app.module.ts
ConfigModule.forRoot({
  load: [appConfig]
}),
```

Using the 2nd approach, when we use the ConfigService to get a env var, our key becomes a path to the variable. Such as configService.get("database.port")

We can take THAT a step further and create objects that represent the config for true type safety. First we make config files that are module scoped:

```ts
import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  environment: process.env.NODE_ENV || 'development',
  database: {
    host: process.env.DATABASE_HOST,
    port: parseInt(process.env.DATABASE_PORT, 10) || 5432,
  },
}));
```

Import that into our module's imports:

```ts
ConfigModule.forFeature(databaseConfig);
```

We can then inject that into Services to get the actual object loaded with our env vars:

```ts
@Inject(databaseConfig.KEY) private readonly config: ConfigType<typeof databaseConfig>
```

## Building Blocks

There are four types of building blocks: Exception Filters, Pipes, Guards and Interceptors.

Each of these can be global scoped in main.ts via attaching to the app via app.useX(new Thing())
Each can be class scoped by using the @UseX attribute on a controller/service (@UsePipe, @UseGuard, etc)
Each can be method scoped by using the @UseX attribute on a controller/server
Pipes can be param scoped, added to route parameters, by adding it to the @Body attribute via @Body(ValidationPipe)

## Metadata

Extra metadata can be set via the @SetMetadata decorator or by creating a custom decorator which implements SetMetadata.

Metadata can be pulled in through building blocks during processing to get extra information, such as in our api-key Guard example below, where we use it to mark functions as @Public() who do NOT need to be validated by that guard.

Metadata can be accessed by having the Reflector class injected in. Once again, see the api-key Guard example for injecting this reflector instance.

## Exception Filters

The catch exception filters handles unhandled exceptions. By default, unhandled exceptions are displayed as a Error 500 with a default message. This is why we usually throw a HttpException. However, if something unexpected crashes, ExceptionFilters allow us control.

When used as a decorator, it should be marked by the @Catch() decorator

We can generate a filter via running the CLI:

```
nest generate filter common/filters/http-exception
```

In our filters, we can do things such as use a logging service to track errors, use an analytics API, or transform the response to include extra data

See src/common/filters/ for examples

## Pipes

Pipes are invoked right before method call, receiving the parameters and gives the ability to transform the pipe.

We can generate a guard via running the CLI:

```
nest g pipe common/pipes/parse-chain-id
```

These pipes receive a value of the currently processed argument, as well as its metadata. Whatever value is returned by this hook will be what is passed in as parameter.

See src/common/pipes/parse-chain-id.pipe.ts to see an example of transforming a int into a ChainId enum value, and throwing if any non-valid chain id is selected

## Guards

Guards can be used to validate things such as API keys, whether routes are public/private, etc.

We can generate a guard via running the CLI:

```
nest g guard common/guards/api-key
```

These guards can be dependency injected, and return true or false on whether requests may be evaluated.

See src/common/guards/api-key.guard.ts to see an example of guarding against requests that are to a private request without the apiKey

## Interceptors

Interceptors add additional behaviour to existing code, without modifying the code itself.

This allows us to:

- Bind extra logic before or after method execution
- Transform the result returned from a method
- Transform an exception thrown by a method
- Extend method behaviour
- Override a method

We can leverage these to create features such as caching/memoization

We can generate an interceptor via running the CLI:

```
nest g interceptor common/interceptors/wrap-response
```

See src/common/interceptors/wrap-response.interceptors.ts for an example of an interceptor which is globally wrapping endpoint calls into the data property of an object, and appending the timestamp & server version number to the call

Also see src/common/interceptors/timeout.interceptors.ts for an example of an interceptor which globally handles requests that take more than 3 seconds as timeout errors.

## Middleware

Middleware is not bound to any method through decorators. Rather, its bound via a route path denoted by a string.

These are setup in the module class itself via giving it a configure method like so:

```ts
export class CommonModule {
  configure(consume: MiddlewareConsumer) {
    consume.apply(CustomMiddleware).forRoutes('*');
  }
}
```

We can also exclude routes by adding the "exclude" method to the chain after apply()

For an example, see src/common/middleware/logging.middleware.ts, where we log the time it took to create a response.

This middleware could be expanded to determine which endpoints are taking too long and log those to a database or other logging tool, to help debug slow calls and what requests were made to make the calls slow.

## Param Decorators

First, for clarity, a Param decorator is NOT a re-implementation of @Param, its a conflict of naming. @Param, @Query, @Body, @Request, these are all Param decorators. A param decorator is a decorator that can go on any Controller's method parameter for any purpose.

Param decorators are created va the createParamDecorator() function, and take in a callback. This callback takes data and a ExecutionContext. From that context we can get the request body to do our work.

See src/common/decorators/protocol.decorator.ts for an example of a param decorator you can add to a endpoint which extracts what protocol was used during the request; likely "http"

To use this decorator, add the following to any endpoint:

```
@Get()
methodName(@Protocol() protocol: string) {
  // protocol is the protocol (http/https/etc) used to access this endpoint
}
```

Passing params to @Protocol will populate the "data" field withing our Protocol's callback, changing it from "unknown" to whatever type is passed in.

## Swagger UI

SwaggerUI allows us to generate a OpenAPI page for interacting with our endpoints.

We set it up during bootstrapping via:

```ts
const options = new DocumentBuilder()
  .setTitle('My Playground')
  .setDescription('To learn NestJS')
  .setVersion('1.0')
  .build();
const document = SwaggerModule.createDocument(app, options);
SwaggerModule.setup('api', app, document);
```

By default, most information is missing, such as request structure, response structure and authentication.

We can generate most of this information adding the "@nestjs/swagger/plugin" to our nest-cWithouli.json's compilerOptions' plugins'

Without this plugin, we would need to add decorators for every piece of information, between every DTO, every entity, every parameters and every return. This plugin will do most of the heavy lifting, however some things will need to be adjusted. We are still able to add decorators to overwrite the plugin's behaviour if needed.

**Tweaks after plugin**
PartialType DTO's will have no data listed. To fix this, we must change the import for PartialType to instead come from @nestjs/swagger rather than @nestjs/mapped-types

To add descriptions & example data to our DTO's, we can use the @ApiProperty decorator on our properties to add more information, such as descriptions. For example, see the create-coffee.dto.ts for an example of adding descriptions and example values.

To add descriptions of possible responses, we can use the @ApiResponse or other @ApiXResponse decorator's on our methods. For example, see the MiscController's teapot endpoint where we add a description to the potential exception. Adding a response overrides any detected ones with the same status code, and is best used for delcaring possible exceptions that might be thrown that may not have been picked up, such as failed to authorize that was thrown by a guard.

### Tags

A way to group resources together in Swagger UI. To tag a grouping, just add the @ApiTags('groupName') to each Controller.

## Testing

NestJs supports testing through jest for virtually every bit of our code.

For unit tests, the files end with .spec.ts and should be in the same directory as the file being tested.

For end-to-end tests, the files end with .e2e-spec.ts and are located in the dedicated test folder in the root directory.

In order to run tests fast, NestJs runs tests in parallel, and organizes tests to run previously failed tests first, and then order them based on time.

### Jest Commands

```
// Unique Commands
npm run test # for unit tests
npm run test:e2e # for end-to-end tests
npm run test:cov # checks which lines of codes in our files are not being tested
npm run test:watch # for unit tests that automatically re-run when code changes are detected

// Specify tests
npm run test ./src/services/coffee.service.ts # Tests ONLY the coffee service
npm run test -- coffee.service # Runs coffee service & any building blocks used by the service, such as guards or pipes
```

### Testing Tips

1. Ensure all providers are available when creating a testing module, however aim to most every single provider.

2. When using TypeORM, the provider declared should use typeORM's getRepositoryToken(Entity), with useValue assigned with a valid mock.

```ts
{
  provide: getRepositoryToken(Entity),
  useValue: {
    findOne: jest.fn((id: number) => new Entity(id))
  }
}
```

3. When determining test coverage, use your mocks! Every branch in the original file must be a branch handled in the mock, and be tested against.

4. As describe() calls can be nested, we can leverage this to organize our tests.

For best practices, we organize into a three tier hierarchy:
-describe('endpoint/method')
--describe('the case being tested)
---it('should do something')
--describe('alternate path to test')
---it('should do something')

For example, this is taken from the coffees.service when testing the findOne method

```ts
describe('findOne', () => {
  describe('when coffee with ID exists', () => {
    it('should return the coffee object', async () => {
      coffeeRepository.findOne.mockReturnValue({});
      expect(await service.findOne('1')).toEqual({});
    });
  });
  describe('when no coffee exists for a ID', () => {
    it('should throw', async () => {
      coffeeRepository.findOne.mockReturnValue(undefined);
      try {
        await service.findOne('1');
      } catch (e) {
        expect(e).toBeInstanceOf(HttpException);
        expect(e.message).toEqual(`Coffee 1 not found`);
      }
    });
  });
});
```

This also organizes the output of our test suite, which is very nice once you have a large codebase with multiple tests.

6. Leverage jest.fn()

With jest.fn() being used by our mocks, we have an array of tools we can utilize.

First and foremost, when calling these functions, we can access the property and add .mockReturnValue(value), among other similarily named functions. This lets us change the behaviour of the next call on that function. By leveraging this, we often don't even need to create an implementation. We just need our mocks to match the structure of the dependency.

Secondly, with jest.fn()'s we can spy on functions to analyze the behaviour. For example, given the aboves' test examples, we could add the line:

```ts
const findOneSpy = jest.spyOn(MockImplementation.prototype, 'findOne');
await service.findOne('1');
expect(findOneSpy).toBeCalledWith('1');
```

We now confirmed that the service did internally call findOne on our implementation.

7. Relative equality

As jest is based on jasmine, it comes out of the box with all of the jasmine testing suite.

Through this, we can check for relative equality through the jest expect() function using jasmine's containg functions.

For example, say we have a dto that gets sent to a service for creating, and a db entity is returned. Presumably, this dto is a partial implementation of the entity - that is, it's missing db fields such as id, or only has the foreign key while the full db entity has the referenced entities returned.

We can do the comparison between a true entity and the dto like so:

```ts
const entity = this.someService.create(dto);
const expectedEntity = jasmine.objectContaining({
  ...dto,
  foriegnKeyMapping: jasmine.arrayContaining(
    dto.foreignKeyMapping.map((name) => jasmine.objectContaining({ name })),
  ),
});
expect(entity).toEqual(expectedEntity);
```

Despite expectedEntity not being an entity, this will pass as jasmine allowed us to preserve the quality that we can check for

8. Make mocks reusable

To increase code-reuse, we can make mocks reusable. Thanks to the jest.fn() we use in our mocks, we can leverage these functions to mock return values easily. This allows us to focus on the structure of our mocks.

For example, all TypeORM repositories share the same methods as one-another, and with jest.fn(), can have their returns mocked. This makes it a perfect candidate to be reused between multiple tests.

See src/common/test/mock-repository.ts and coffees.service.spec.ts for a example of this

9. If you are using a Transient or Request scoped provider, the standard module.get<CustomProvider>(CustomProvider) will return undefined. Instead, we just use the module.resolve function to access it.

10. Tests are a wholly different environment from src, which has a couple quirks. The ones to know about are:

a) In production/development, you can use absolute URLs for imports. In tests, everything is expected to use relative imports.

b) In production/development, if the file name has capitals but the import is lower case, it will resolve the file properly. In tests, consistency is required.

11. it.todo

We can make reminders for tests to make via adding it.todo(descriotion) calls in our describe!

### Unit Tests

Tests each individual function behaves the way expected. We frequently mock every or nearly every dependency injected into the file, and just test that the function did what it was expected to do.

As a metric for how granular we should be, the best practice is to aim that every test should not fail because any dependency failed. Failures through dependencies are a tell sign that the code was relying on the dependency, and that dependency should have been mocked to do no logic other than return what the caller NEEDS.

### End-to-end Tests

End-to-end tests are structured very similarily to the Unit Test suites, however have more available to use.

First, after compiling the module, we run module.createNestApplication() to turn build a full Nest application. This is a light application compared to our full production environment, since it's both leveraging the TestingModule and also only contains whatever modules were imported. However, this is still heavy compared to Unit Tests.

Secondly, we use the supertest package to create real http requests that we can feed into this test app. This allows us to hit real endpoints with real data, and assert the expected returns and behaviour.

e.g.

```ts
request(app.getHttpServer())
  .get(entrypointPath)
  .set(headerKey, value)
  .expect(statusCode)
  .expect(returnedResponse);
```

Since end-to-end tests effectively run the full application, we may need to run code cleanup, such as shutting down a db connection. Do invoke the shutdown, add this afterAll in the end-to-end test's describe

```ts
afterAll(() => {
  app.close();
});
```

#### Databases

Databases are a challenge for end-to-end tests. We have two solutions:

1. Mock every TypeORM repository, which gives us full flexibility, but is time consuming, and makes testing queries impossible

2. Use an in-memory database, where we don't have to mock anything.

3. Use a testing database, which is the most "real" test we can do. This adds complexitiy and overhead, however is recommended as the best practice.

As we follow best practices here, we went with ption 3. In our docker-compose.yml, we added a test-db service that uses a separate port, and in package.json added a pretest and posttest commands for docker composing up and down our database. This allows our tests to connect to this database.

When tests connect, they should set synchronize, which allows our Entities to drive the database schema. By doing this, we do not need to worry about database versions or migrations.

See coffees.e2e-spec.ts for how we configured this connection.

### Jest Utilities

### Best Practices

### Services

src/name/name.service.spec.ts

### Controllers

src/name/name.controller.spec.ts

### Filters

src/common/filters/name.filter.spec.ts

### Guards

src/common/guards/name.guard.spec.ts

### Interceptors

src/common/interceptors/name.interceptor.spec.ts

### Pipes

src/common/pipes/name.pipe.spec.ts

### Middleware

src/common/middleware/name.middleware.spec.ts

### End-to-end

test/name.e2e-spec.ts

## Misc IYK TODO Notes

If app.module.ts set "autoLoadEntities: true", it does NOT need to import each entity. Only the submodule needs to import

Using ExceptionFilters, we can enhance our error handling to catch type Error 500's or raw strings to have better error handling

Using guards we can create a private API key for non-public entrypoints. We can create a custom property @Public to attach to public Controller methods, to bypass this key requirement. This is similar to how Ryan did the guard for Jwt tokens, but something we could expand for private calls such as eth-contract task deployments or a more expansive IYK only dashboard

Using Pipes, we can create pipes to validate non-standard input, such as validating only supported chain ids are passed to an endpoint, rather than just passing the number back

Using Middleware, we can track which endpoints take too long to respond, and what the request parameters were to make the calls slow. This can help us debug things such as learn when our Alchemy pagination is slowing down our user experience or whatever else could be slow.

Using Swagger, we can create OpenAPI docs

# Clean Code Guide

This is a guide to intentional, cared for clean code.

## High-Level Philosophy

1. Follow standard conventions.

2. Keep it simple. Reduce complexity wherever possible.

3. Leave the campground cleaner than you found it.

4. Broken windows show a lack of care, and un-cared for code invites future contributors to not care. By starting clean, it's easier for future contributors to keep it clean and follow your lead.

5. More time is spent reading code than writing it - at least a 10:1 ratio. Therefore, creating clean code that is easy to read and understand will save you more time in the future than you realize. It's not just about how hard it is to add to the code in the future, it's also saving time when future-you has to re-read it when remembering how to interact with it, how its called, how it calls things, etc.

6. Optimize code early without adding complexity.
   That is, don't over-optimize, creating extra caches or nwe concepts. But put thought into your loops, look at who calls it, look at what you're calling. Make sure it's _good_ code before its commited. If another developer sees this code and tries to logic it out, there shouldnt be any easy obvious optimizations, as every time a developer touches it, we risk the code getting worse.

7. The code should be elegant, and read like a graphic novel. It should not be a puzzle to resolve what was being done. A developer should be able to look at it, and it paints a picture in their head of how it flows. It should not strain the brain to understand, it should be _obvious_ what it is doing, and build up to a climax where it elegantly comes together.

## Naming

1. Names should reveal intent

2. Class names should emphasize a noun, while functions should emphasize a verb.

For example, Student is a noun. If we need to add more context to students, it should never be "WritingTestStudent" or anything with a verb-first, it should be "StudentThatWritesTests" where it's noun-first. The ONLY exception is it MAY be adjective-first if that is more readeable, but NEVER verb first.

Likewise, if a function exists for this student to write a test, it should start with that verb, write. If we need to further explain, it should be writeTest rather than testGetsWritten or something that puts the noun first. For functions, we start with a verb, and then add nouns/adjectives to describe the action further. For examples, writeTest, writeExam, writeSAT, writeSATInPen, etc. The only exception is it MAY be adjective first if that is more readeable, but NEVER noun first.

3. Names should avoid disinformation. If something LOOKS like it returns one thing but returns another, or something LOOKS like it does one thing but does not, the name should be changed.

4. Make meaningful distinctions. It's better to make edge-cases throughly explained, than to follow a convention. For example, if in a Polymorphic design, most implementations have an "add" but one case is better described as "append", the second case should NOT call it "add" for the sake of following convention. Or if most implementations have a "connect" but one child is in-memory and does not need to connect to anything external, it should not have "connect" create the in-memory mapping. You should work to find a way to describe what is actually happening, even if it means pushing things our of the parents that appeared common at first and creating interfacts for these different behaviours that the children can selectively implement.

5. Names should be pronounceable. There should be no weird acronyms that future developers must learn. The name should make sense when said outloud in a sentance, as programming is a social activity.

6. Names should be searcheable, even if achieving this makes the names longer. If a function is named "catch", and you searched the repo for it, you will get more results than appropriate. However, if you name something "handleWeb3Errors", you would only find what you are looking for in the search.

7. Avoid all encodings when using modern languages & IDEs. Be concise.

For example, the m\_ prefix used to be used to denote a member variable. These types of encoding are no longer necessary with modern tooling.

Same with interfaces, traditionally you would have a IDatabase and a Database implementation. You should not have an interface prefixed with the letter i, instead it should just be Database. If anything, the implementation should have the extra information, such as a Database interface with a SQLiteDatabase implementation.

8. Avoid mental mappings. A poorly-named shorthand variable such as "data" should not be set to the result of a db query or REST request once set to a local variable. You should not have to remember that data is a object that contains an array of Phygitals. The ONLY exception to this is the traditional i/j/k indexes for forloops, as that is a standard convention. Every other case, the variables should be self-explanetory.

9. Pick one word per concept. Back to the student example, StudentData and StudentInfo would be poor class names for two reasons, but for this point, the reason is because there is more than one word to describe the fact that it's a Student object. If we had to add more information, such as the student is a senior, than it could be SeniorStudent. But we still keep it at one word per concept.

There are two exceptions; first is words that are not a noun, verb or adjective, that simply make the name read better, such as words like "with" or "who". These are allowed as they do not add a second word to a concept, they just make it more readeable when read outloud in a conversation.

The second exception is if these extra words have meaning in your conventions. For example, "Data" and "Info" mean the same thing are are poor names within the context of a NestJS API. However, StudentEntity, StudentDTO and StudentBO have clearly defined meaning in NestJS, where the Entity postfix means the object came from/is going into TypeORM, a DTO postfix means the object came from a endpoint's body, and BO might be our own convention to mean our code created it to organized data between our controller to our service and back.

10. Avoid multiple words that share the same meaning. Back to the StudentData vs StudentInfo example, the second reason this is bad naming is that, as we said, these mean the same thing. If there is no extra meaning from our conventions, than Data and Info just meant he same thing, and as Student is a class, it naturally already holds data/info. Therefore, it's best to remove Data/Info from the name and just call it "Student". We don't want to have multiple classes whose meaning sounds the same, confusing future developers on what the distinction is.

11. Use Solution Domain Names first. If there is a computer science term or internal term your developers use to describe something, that is the first choice of names. For example, if our programmers called something "Phygitals" but our customers call them "Phygi-Digitals", our code should reflect our solution domain name, phygital.

12. Use Problem Domain Names second. If there is not a computer science nor internal developer term for what is being described, the second best choice is what our consumers or business team members would call it. For example, if we need to call something a NFT, but for whatever reason our solution domain names such as ERC721/ERC1155/POAP/Guestbook/Phygital would be innapropriate (such as a database table that tries to use all of them), the problem domain name of "NFT" or "Token" may be an appropriate problem domain name to use. That is much better than creating a new term for the sake of this one use case.

13. Add meaningful context. The terms "firstName", "lastName", "street", "city", "state", "zipCode" might logically make sense when the variables are side-by-side, however out of context, something like "state" might not appear to be a part of an address. If some React component shows the state, the code might read like it's using a second meaning for that word (perhaps whether the input is valid or not might be another meaning behind "state").

In these cases, adding context is important. This could be as simple as calling them "addressState", "addressCity", etc. so it reads that it's part of an address, or be further taken to create an "Address" class so even the compiler understands the grouping of these variables.

14. Don't add gratuitous context, meaning, don't add so much context that it ruins the ability to search or read names easily. If LeasedTag and OwnedTag are used in the Phygitals module, they should not be called PhygitalsModuleLeasedTag and PhygitalsModuleOwnedTag. Yes, that does give more context, but to a fault. First, this can lead to code duplication when a developer is working in a NFTModule and wants to reference LeasedTag - they may assume LeasedTag is unique to PhygitalsModule and they must make their own. Second, it makes searching for these variables very diffucult, as adding PhygitalsModule to every class in that module creates so much noise, it loses it's meaning. Keep is simple and straight forward.

## Functions

1. Functions should be small! Ideally, they should be 1-4 lines of code. If they reach 20 lines of code, you must have a really good reason to do so.

2. Functions should do ONE thing. If they do more than one thing, those parts should be extracted, and consider being renamed into something that describes the total work being done. For example, if "CreateUser" reads data from fields, composes a UserEntity and uploads it to the database, that's three things. Each of those steps should be extracted into their own methods (ReadUserFields, CreateUserEntity, UploadUser)

3. There should only be ONE level of abstraction per function. For example, in NestJS, Controllers calling Services is one level of abstraction away, so calling multiple services is good. However, Controllers should not call our API folder, as that is a level deeper that should be called by our Services. Mixing these concepts gets confusing, and once done, leads to future contributors to continue mixing these concepts.

4. Reading code top to bottom. Our classes and files should be structured as best possible so it can be read top-down. Constants at the top of the file where they first get executed, constructors at the top of a class where it first gets instantiated, variables surrounding the contructor where they first get setup, public functions below the constructor where the entrypoints get called, private functions below the public ones who get called by the public functions. You should not have to go back and forth from scrolling down and up to read the code, just read down.

5. Prefer polmorphism to switch cases. Generally, the only switch case that should exist is the one that creates these Polymorphic entities. Otherwise, if each method needs to do the switch statements, every time a item is added to this statement, it must be added to many functions/files. Whereas if it's Polymorphic, a new class must be created and a single code change on the single switch statement must occur. This reduces the impact of future additions.

6. Function names should be descriptive, even if it makes them long.

7. Functions should have zero to three arguments, anymore is a code smell.

8. Flags/boolean arguments are a sign that the function likely is doing more than one thing.

9. It's OKAY for multiple arguments beyond 3 IF the 3rd and onward effectively are a list. For example, consider anything that takes args at the end to count as one argument.

10. It's encourgaged to group multiple arguments into objects. It is not creating to group chainId/chainName/explorer into a Chain object.

11. Be mindful of similarly-themed parameters and their ordering. Consider assert(expected, actual). It's VERY EASY to mix those up, and put the expected value where equals is and vice versa. A better name might be assertExpectedEqualsActual. It might be longer, but if order matters, describe the order.

12. Functions should have NO SIDE EFFECTS. They should do what they say. Going back to our "CreateUser" which uploads to db example in point #2, on top of extracting the work, that function should be renamed in a way that explains a db upload occurs. It should be something more akin to "UploadUserFromFieldsToDatabase". Any effect that occurs that is not described by the function name is a side effect, and is where most of our bugs will hide.

13. Functions should either do something or answer something, but not both. Similar to how Solidity separates Views from executable functions. A "set" function should not return what was set, nor return that a set was successful.

14. Functions should throw exceptions rather than return error codes. Returning a error code encourages a `if (function() == E_OK)` pattern where a function call is used as a expression. This leads to deeply nested structures, and readeable code minimizes nesting.

15. Try/catch blocks are ugly and are their own thing. As such, following the "functions should do one thing" principle, these try/catches should be their own function that handle error handling. So if a Try/catch/finally is used, the "try" should be the first line of a function, and "finally" should be the end of the function. There should be no code before or after the try/catch/finally.
    Also, the code executed in the try should be extracted to its own private function. The try/catch's one thing is error handling what occurs in that function, and that extracted functions one thing is doing the thing we are trying.

16. Don't repeat yourself. Avoid duplicate code as much as possible, extracting logic into small private functions freely if that work is re-done by many functions.

For example, if a class does db work and needs to setup & teardown anything on each function, that setup and teardown should be extracted to their own setup & teardown private methods. These should then be at the start and end of every other function. Even if setup & teardown is just a couple lines of code, we should extract them, as they are duplicates, and we don't repeat ourselves.

17. Every block of code in a function should have one entry and one exit. There should only be one return, we should aim for no breaks or continues in loops, and NEVER a goto. The only exception is if the function is so small that multiple returns actually improves code clarity, such as:

```ts
if (authenticated) {
  return resp(200);
} else {
  return resp(404);
}
```

18. How do you actually write this?
    Don't start by extracting things before it's proven to be needed. Start by writing the ugly, bloated, long code with too many parameters, until you have what works and know exactly which parameters ended up being needed, and what setup/teardown was needed.
    However, before you commit, take the time to care for the function. Once it's ready, start extracting, start grouping parameters into classes. Do the work first the way we're used to, and immediately clean up afterwards.
