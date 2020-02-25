#include "STM32L1xx.h"

#define INS GPIOB->IDR & 0x0F;

uint8_t key = 0;

uint8_t lu[] = {1,4,7,0xE,2,5,8,0,3,6,9,0xF,0xA,0xB,0xC,0xD};
uint8_t log_2(uint8_t num){
	uint8_t ret;
	for( ret = 0; num > 0; ret++){
		num = num >> 1;
	}
	return ret-1;
}
void delay_us(int delay) {
    TIM6->SR = 0;	
    TIM6->PSC =  16-1;
    TIM6->ARR = delay;
    TIM6->CNT = 0;
    TIM6->CR1 |= TIM_CR1_CEN;
    while (!(TIM6->SR & TIM_SR_UIF));
}
void delay_ms(int delay) {
    TIM6->SR = 0;	
    TIM6->PSC =  16000-1;
    TIM6->ARR = delay-1;
    TIM6->CNT = 0;
    TIM6->CR1 |= TIM_CR1_CEN;
    while (!(TIM6->SR & TIM_SR_UIF));
}
void setupTimer10() {
	TIM10->SR = 0;	
	TIM10->PSC =  16-1;
	TIM10->ARR = 1000-1;
	TIM10->CCR1 = 0;
	TIM10->CNT = 0;
	TIM10->CCMR1 = 0x00000060;
	//TIM10->CCMR1 &= 0xFFFFFFEC;
	TIM10->CCER = 0x00000001;
	TIM10->CR1 |= TIM_CR1_CEN;
	
}
void display() {
	GPIOC->ODR = key & 0x0F;
}
void EXTI0_IRQHandler(){
	uint8_t qq;
	
	for(char i = 0; i < 4; i++){
		GPIOB->ODR = 0x000000F0 & (~(0x10 << i));
		delay_ms(2);
		qq = INS;
		if(qq != 0xF) {
			key = lu[4*i + log_2((~qq)&0x0F)];
			if (key <= 10)
				TIM10->CCR1 = key*100;
			break;
		}
	}
	GPIOB->ODR = 0x00000000;
	display();
	EXTI->PR = 0x00FFFFFF;
}

void pinSetup() {
    RCC->APB1ENR |= 0x00000030; //enable tim 6 and tim7
	RCC->APB2ENR |= 0x00000008; //enable tim10
    RCC->AHBENR  |= 0x07;
    
	GPIOA->MODER &= ~0x00003FFF;
	GPIOA->MODER |= 0X00002000;  

	GPIOA->AFR[0]   &= ~0x0F000000;  //clear AFRL6 
	GPIOA->AFR[0]   |= 0x03000000;  //PA6 = AF3 

	GPIOB->MODER = 0x00005500;
	GPIOB->PUPDR = 0x00000055;

	GPIOC->MODER &= ~0xFFFFFFFF;
    GPIOC->MODER |=  0x55555555;
}
	
int main(void){
	
	SYSCFG->EXTICR[0] = 0;
	//EXTI->RTSR = 	0x00FFFFFF;
	EXTI->EMR = 	0x00000001; 
	EXTI->IMR = 	0x00000001;
	EXTI->FTSR = 	0x00000001;
	NVIC_EnableIRQ(EXTI0_IRQn);
	NVIC_ClearPendingIRQ(EXTI0_IRQn);  

	RCC->CR |= RCC_CR_HSION;                    // Turn on 16MHz HSI oscillator 
	while ((RCC->CR & RCC_CR_HSIRDY) == 0);   // Wait until HSI ready 
	RCC->CFGR |= RCC_CFGR_SW_HSI;          // Select HSI as system clock 
	
	pinSetup();
	GPIOB->ODR = 0x00000000;
	__enable_irq();
    while(1);
}