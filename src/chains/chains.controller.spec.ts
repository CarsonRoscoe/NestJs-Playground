import { HttpException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ChainIds } from '../common/constants/ChainIds';
import { ChainsController } from './chains.controller';
import { ChainsService } from './chains.service';

const mockChainService = {
  getChainName: jest.fn(),
};

describe('ChainsController', () => {
  let controller: ChainsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChainsController],
      providers: [
        {
          provide: ChainsService,
          useValue: mockChainService,
        },
      ],
    }).compile();

    controller = module.get<ChainsController>(ChainsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getChainInfo', () => {
    it('should created a aggregated chain object', () => {
      const chainId = ChainIds.Ethereum;
      const name = 'Ethereum';
      mockChainService.getChainName.mockReturnValue(name);
      expect(controller.getChainInfo(chainId)).toEqual({
        chainId,
        name,
      });
    });

    it('should throw on invalid chain id', () => {
      try {
        controller.getChainInfo(2);
        expect(false);
      } catch (e) {
        expect(e).toBeInstanceOf(HttpException);
        expect(e.message).toEqual(`${2} is not a supported chainId`);
      }
    });
  });
});
