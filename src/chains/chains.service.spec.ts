import { Test, TestingModule } from '@nestjs/testing';
import { ChainIds } from '../common/constants/ChainIds';
import { ChainsService } from './chains.service';

describe('ChainsService', () => {
  let service: ChainsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ChainsService],
    }).compile();

    service = module.get<ChainsService>(ChainsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getChainName', () => {
    it("should return the ChainId's name", () => {
      expect(service.getChainName(ChainIds.Ethereum)).toEqual('Ethereum');
    });
    it('should throw if a invalid chainId is entered', () => {
      try {
        service.getChainName(2);
        expect(false);
      } catch (e) {
        expect(e).toBeInstanceOf(TypeError);
        expect(e.message).toEqual("Cannot read property '0' of undefined");
      }
    });
  });
});
